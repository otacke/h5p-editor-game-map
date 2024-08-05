import MapElement from '@components/map-editor/map-elements/map-element.js';
import Stage, { DEFAULT_SIZE_PERCENT } from '@components/map-editor/map-elements/stage.js';
import Util from '@services/util.js';
import { STAGE_TYPES } from '@components/map-editor/map-elements/stage.js';

/**
 * Mixin containing methods that are related to being called from DnB.
 */
export default class DnBCalls {
  /**
   * Create map element.
   * @param {number} [type] Type of element.
   * @param {object} [params] Element parameters as used in semantics.json.
   * @returns {H5P.jQuery} Element DOM. JQuery required by DragNBar.
   */
  createElement(type, params) {
    /*
     * This is okay for now, but if other elements than stages need to be
     * added to map elements, this needs changing - including semantics :-/.
     */
    const numberUnnamedStages =
    this.params.elements.filter((element) =>
      element.label.startsWith(
        `${this.params.dictionary.get('l10n.unnamedStage')} `,
      ),
    ).length + 1;

    const stage = new Stage();

    const newContent = stage;

    const mapSize = this.map.getSize();
    const mapRatio = mapSize.width / mapSize.height;

    let elementParams = {};

    if (
      type === STAGE_TYPES.stage ||
      type === STAGE_TYPES['special-stage']
    ) {
      elementParams = Util.extend({
        id: H5P.createUUID(),
        label: `${this.params.dictionary.get('l10n.unnamedStage')} ${numberUnnamedStages}`,
        content: newContent,
        telemetry: {
          x: `${50 - DEFAULT_SIZE_PERCENT.width / 2 }`,
          y: `${50 - DEFAULT_SIZE_PERCENT.height * mapRatio / 2 }`,
          width: `${DEFAULT_SIZE_PERCENT.width}`,
          height: `${DEFAULT_SIZE_PERCENT.height * mapRatio}`
        },
        neighbors: []
      }, params);
    }

    const mapElement = new MapElement(
      {
        type: type,
        globals: this.params.globals,
        index: this.mapElements.length,
        content: newContent,
        elementParams: elementParams,
        elementFields: this.params.elementsFields,
        toolbar: this.toolbar
      },
      {
        onEdited: (mapElement) => {
          this.edit(mapElement);
        },
        onRemoved: (mapElement) => {
          this.removeIfConfirmed(mapElement);
        },
        onBroughtToFront: (mapElement) => {
          this.bringToFront(mapElement);
        },
        onSentToBack: (mapElement) => {
          this.sendToBack(mapElement);
        },
        onChanged: (index, elementParams) => {
          if (elementParams.specialStageType) {
            stage.setIcon(elementParams.specialStageType);
          }
          else {
            stage.setIcon(null);
          }

          this.params.elements[index] = elementParams;
          this.callbacks.onChanged(this.params.elements);
        }
      }
    );

    this.mapElements.push(mapElement);
    this.map.appendElement(mapElement.getDOM());

    return mapElement.getData().$element;
  }

  /**
   * Update map element.
   * @param {number} index Map element index.
   * @param {number} x X position as percentage value.
   * @param {number} y Y position as percentage value.
   */
  updateMapElement(index, x, y) {
    this.mapElements[index].updateParams({ telemetry: { x: x, y: y } });
  }

  /**
   * Update all paths.
   * @param {object} [params] Parameters.
   * @param {number} [params.limit] Number of stage that needs updating only.
   */
  updatePaths(params = {}) {
    // Intentionally not creating one long chain here.

    let requiredPaths = H5P.cloneObject(this.params.elements);

    // Determine from-to combination without vice verse pair to check
    requiredPaths = requiredPaths.reduce((paths, current, index) => {
      current.neighbors.forEach((neighbor) => {
        if (
          !paths.includes(`${index}-${neighbor}`) &&
          !paths.includes(`${neighbor}-${index}`)
        ) {
          paths.push(`${index}-${neighbor}`);
        }
      });
      return paths;
    }, []);

    // Create update list for Paths
    requiredPaths = requiredPaths.map((combo) => {
      const stages = combo.split('-');

      // Don't compute telemetry values for paths that have not changed
      let pathTelemetry = null;
      if (
        typeof params.limit !== 'number' ||
        parseInt(stages[0]) === params.limit ||
        parseInt(stages[1]) === params.limit
      ) {
        pathTelemetry = this.computePathTelemetry({
          from: this.params.elements[parseInt(stages[0])].telemetry,
          to: this.params.elements[parseInt(stages[1])].telemetry
        });
      }

      return {
        from: parseInt(stages[0]),
        to: parseInt(stages[1]),
        pathTelemetry: pathTelemetry
      };
    });

    this.paths.update({ paths: requiredPaths });
  }

  /**
   * Update neighbors so we keep a symmetrical relationship.
   * @param {string} id Id of element that was changed.
   * @param {string[]} neighbors List of neighbors that element should have.
   */
  updateNeighbors(id, neighbors) {
    this.params.elements.forEach((element, index) => {
      if (neighbors.includes(`${index}`)) {
        if (!element.neighbors.includes(id)) {
          element.neighbors.push(id);
          // Sorting not really necessary, but why not ...
          element.neighbors.sort((a, b) => {
            return parseInt(a) - parseInt(b);
          });
        }
      }
      else {
        if (element.neighbors.includes(id)) {
          const position = element.neighbors.indexOf(id);
          element.neighbors.splice(position, 1);
        }
      }
    });

    this.callbacks.onChanged(this.params.elements);
  }

  /**
   * Edit map element.
   * @param {MapElement} mapElement Map element to be edited.
   */
  edit(mapElement) {
    this.toolbar.hide();
    this.map.hide();

    // Make all stages available to be neighbors
    this.params.elementsFields
      .find((field) => field.name === 'neighbors')
      .options = this.params.elements
        .map((elementParams, index) => {
          return { value: `${index}`, label: elementParams.label };
        });

    const neighbors = H5PEditor.findField('neighbors', mapElement.form);
    if (neighbors) {
      neighbors.setDictionary(this.params.dictionary);

      // Tell list widget this stage's id to be excluded
      neighbors.setActive({
        id: `${mapElement.getIndex()}`,
        neighbors: this.params.elements[mapElement.getIndex()].neighbors,
        onNeighborsChanged: (id, neighbors) => {
          this.updateNeighbors(id, neighbors);
        }
      });
    }

    this.dialog.showForm({
      form: mapElement.getData().form,
      doneCallback: () => {
        const isValid = this.validateFormChildren(mapElement);

        if (isValid) {
          this.toolbar.show();
          this.map.show();
          this.updatePaths();
          mapElement.updateParams();

          this.callbacks.onChanged(this.params.elements);
        }

        return isValid;
      },
      removeCallback: () => {
        this.toolbar.show();
        this.map.show();
        this.removeIfConfirmed(mapElement);
      }
    });

    setTimeout(() => {
      this.toolbar.blurAll();
    }, 0);
  }

  /**
   * Validate form children.
   * @param {MapElement} mapElement Mapelement that the form belongs to.
   * @returns {boolean} True if form is valid, else false.
   */
  validateFormChildren(mapElement) {
    /*
     * `some` would be quicker than `every`, but all fields should display
     * their validation message
     */
    return mapElement.getData().children.every((child) => {
      // Accept incomplete subcontent, but not no subcontent
      if (child instanceof H5PEditor.Library && !child.validate()) {
        if (child.$select.get(0).value !== '-') {
          return true; // Some subcontent is selected at least
        }

        const errors = mapElement.getData().form
          .querySelector('.field.library .h5p-errors');

        if (errors) {
          errors.innerHTML = `<p>${this.params.dictionary.get('l10n.contentRequired')}</p>`;
        }

        return false;
      }

      return child.validate() ?? true; // Some widgets return `undefined` instead of true
    });
  }

  /**
   * Remove map element after confirmation.
   * @param {MapElement} mapElement Map element to be removed.
   */
  removeIfConfirmed(mapElement) {
    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveConfirm')
    });
    this.deleteDialog.on('confirmed', () => {
      this.remove(mapElement);
    });

    this.deleteDialog.appendTo(this.dom.closest('.field-name-gamemapSteps'));
    this.deleteDialog.show();
  }

  /**
   * Remove map element.
   * @param {MapElement} mapElement Map element to be removed.
   */
  remove(mapElement) {
    const removeIndex = mapElement.getIndex();

    // Remove from neigbors and re-index rest
    this.params.elements.forEach((element) => {
      if (element.neighbors.includes(`${removeIndex}`)) {
        // Remove map element to be removed from neighbors
        element.neighbors.splice(element.neighbors.indexOf(`${removeIndex}`), 1);
      }

      // Re-index neighbors
      element.neighbors = element.neighbors.map((neighbor) => {
        const neighborNumber = parseInt(neighbor);
        return (neighborNumber < removeIndex) ?
          neighbor :
          `${parseInt(neighbor) - 1}`;
      });
    });

    // Remove element
    mapElement.remove();
    this.mapElements.splice(removeIndex, 1);
    this.params.elements.splice(removeIndex, 1);

    // Re-index elements
    this.mapElements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.callbacks.onChanged(this.params.elements);

    this.updatePaths();
  }

  /**
   * Bring map element to front.
   * @param {MapElement} mapElement Map element to be brought to front.
   */
  bringToFront(mapElement) {
    /*
     * If position in this.params.elements becomes relevant, move element there
     * and re-index everything
     */
    this.map.appendElement(mapElement.getDOM());
  }

  /**
   * Send map element to back
   * @param {MapElement} mapElement Map element to be sent to back.
   */
  sendToBack(mapElement) {
    /*
     * If position in this.params.elements becomes relevant, move element there
     * and re-index everything
     */
    this.map.prependElement(mapElement.getDOM());
  }
}
