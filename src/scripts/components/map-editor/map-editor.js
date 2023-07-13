import Paths from '@models/paths';
import Util from '@services/util';
import Dialog from './dialog';
import Map from './map';
import MapElement from './map-elements/map-element';
import Toolbar from './toolbar';
import './map-editor.scss';
import Stage from './map-elements/stage';

export default class MapEditor {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.elements] Stage's parameters.
   * @param {object} [params.elementsFields] Stage's fields.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: []
    }, params);

    this.params.elements = this.params.elements ?? [];

    this.callbacks = Util.extend({
      onChanged: () => {}
    }, callbacks);

    this.mapElements = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-editor');

    this.map = new Map({}, {
      onImageLoaded: (image) => {
        this.handleBackgroundImageLoaded(image);
      }
    });

    this.paths = new Paths({ map: this.map });

    this.toolbar = new Toolbar(
      {
        buttons: [this.createButton('stage')],
        mapContainer: this.map.getDOM(),
        dialogContainer: this.dom
      },
      {
        onStoppedMoving: (index, x, y) => {
          this.updateMapElement(index, x, y);
          this.updatePaths({ limit: index });
        },
        onReleased: (index) => {
          this.edit(this.mapElements[index]);
        },
        onMoved: (index, x, y) => {
          this.updateMapElement(
            index,
            this.convertToPercent({ x: x }),
            this.convertToPercent({ y: y })
          );
          this.updatePaths({ limit: index });
        }
      }
    );

    this.dialog = new Dialog({ dictionary: this.params.dictionary });

    this.dom.appendChild(this.toolbar.getDOM());
    this.dom.appendChild(this.map.getDOM());
    this.dom.appendChild(this.dialog.getDOM());

    this.params.elements.forEach((elementParams) => {
      this.createElement(elementParams);
    });

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');

    window.requestAnimationFrame(() => {
      this.sanitizeParams();
      this.updatePaths();
    });
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Set map background image.
   * @param {string} url URL of image.
   */
  setMapImage(url) {
    this.map.setImage(url);
  }

  /**
   * Create button for toolbar.
   * @param {string} id Id.
   * @returns {object} Button object for DragNBar.
   */
  createButton(id) {
    // Button configuration is set by DragNBar :-/
    return {
      id: id,
      title: this.params.dictionary.get(`l10n.toolbarButton-${id}`),
      createElement: () => {
        return this.createElement();
      }
    };
  }

  /**
   * Create map element.
   * @param {object} [params] Element parameters as used in semantics.json.
   * @returns {H5P.jQuery} Element DOM. JQuery required by DragNBar.
   */
  createElement(params) {
    /*
     * This is okay for now, but if other elements than stages need to be
     * added to map elements, this needs changing - including semantics :-/.
     */

    const numberUnnamedStages = this.params.elements.filter((element) => {
      return element.label.indexOf(`${this.params.dictionary.get('l10n.unnamedStage')} `) === 0;
    }).length + 1;

    const stage = new Stage({});

    const newContent = stage;

    const mapSize = this.map.getSize();
    const mapRatio = mapSize.width / mapSize.height;

    const elementParams = Util.extend({
      id: H5P.createUUID(),
      type: 'stage',
      label: `${this.params.dictionary.get('l10n.unnamedStage')} ${numberUnnamedStages}`,
      content: newContent,
      telemetry: {
        x: `${50 - newContent.getDefaultSize().width / 2 }`,
        y: `${50 - newContent.getDefaultSize().height * mapRatio / 2 }`,
        width: `${newContent.getDefaultSize().width}`,
        height: `${newContent.getDefaultSize().height * mapRatio}`
      },
      neighbors: []
    }, params);

    const mapElement = new MapElement(
      {
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
        /*
         * `some` would be quicker than `every`, but all fields should display
         * their validation message
         */
        const isValid = mapElement.getData().children.every((child) => {
          // Accept incomplete subcontent, but not no subcontent
          if (child instanceof H5PEditor.Library && !child.validate()) {
            if (child.$select.get(0).value === '-') {
              const errors = mapElement.getData().form
                .querySelector('.field.library .h5p-errors');

              if (errors) {
                errors.innerHTML = `<p>${this.params.dictionary.get('l10n.contentRequired')}</p>`;
              }
            }
            else {
              return true;
            }
          }

          if (child instanceof H5PEditor.Number && !child.validate()) {
            if (child.value === undefined && child.field.optional) {
              return true;
            }
          }

          return child.validate();
        });

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
   * Sanitize parameters. Will keep x/y coordinates within boundaries.
   */
  sanitizeParams() {
    // TODO: Fix for percent
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return;
    }

    this.params.elements.forEach((elementParams, index) => {
      const telemetry = elementParams.telemetry;

      // Convert percentage values to px.
      const toPxFactor = { x: mapSize.width / 100, y: mapSize.height / 100 };
      let xPx = parseFloat(telemetry.x) * toPxFactor.x;
      let yPx = parseFloat(telemetry.y) * toPxFactor.y;

      // Adjust stage hotspot height for new aspect ratio
      telemetry.height =
        parseFloat(telemetry.width) * mapSize.width /
        mapSize.height;

      const widthPx = parseFloat(telemetry.width) * toPxFactor.x;
      const heightPx = parseFloat(telemetry.height) * toPxFactor.y;

      // Confine values
      xPx = Math.max(0, Math.min(xPx, mapSize.width - widthPx));
      yPx = Math.max(0, Math.min(yPx, mapSize.height - heightPx));

      this.mapElements[index].updateParams({telemetry: {
        x: xPx * 100 / mapSize.width,
        y: yPx * 100 / mapSize.height,
        height: telemetry.height
      }
      });
    });
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
   * Compute path telemetry.
   * @param {object} [params] Parameters.
   * @param {object} [params.from] Parameters for start stage.
   * @param {number} [params.from.x] X position of start stage in %.
   * @param {number} [params.from.y] Y position of start stage in %.
   * @param {number} [params.from.width] Width of start stage in px.
   * @param {number} [params.from.height] Height of start stage in px.
   * @param {object} [params.to] Parameters for target stage.
   * @param {number} [params.to.x] X position of target stage in %.
   * @param {number} [params.to.y] Y position of target stage in %.
   * @param {number} [params.to.width] Width of target stage in px.
   * @param {number} [params.to.height] Height of target stage in px.
   * @returns {object} Telemetry date for an path
   */
  computePathTelemetry(params = {}) {
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return null;
    }

    const fromXPx = parseFloat(params.from.x) / 100 * mapSize.width;
    const fromYPx = parseFloat(params.from.y) / 100 * mapSize.height;
    const toXPx = parseFloat(params.to.x) / 100 * mapSize.width;
    const toYPx = parseFloat(params.to.y) / 100 * mapSize.height;
    const widthPx = parseFloat(params.from.width) / 100 * mapSize.width;
    const heightPx = parseFloat(params.from.height) / 100 * mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    // Angle in radians
    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    // Distance from center to border
    const offsetToBorder = {
      x: widthPx / 2 * Math.cos(angle) * 100 / mapSize.width,
      y: heightPx / 2 * Math.sin(angle) * 100 / mapSize.height
    };

    // Border width
    const targetPathWidth = parseFloat(
      this.params.globals.get('getStylePropertyValue')(
        '--editor-fields-visual-paths-style-pathWidth'
      )
    );
    const width = Math.min(
      Math.max(1, widthPx * targetPathWidth), widthPx * 0.3
    );

    const offsetPathStroke = width / 2 * 100 / mapSize.height;

    // Position + offset for centering + offset for border (+ stroke offset)
    const x = parseFloat(params.from.x) +
      parseFloat(params.from.width) / 2 +
      offsetToBorder.x;

    const y = parseFloat(params.from.y) +
      parseFloat(params.from.height) / 2 +
      offsetToBorder.y -
      offsetPathStroke;

    // Good old Pythagoras, length in px
    const length = Math.sqrt(
      Math.abs(deltaXPx) * Math.abs(deltaXPx) +
      Math.abs(deltaYPx) * Math.abs(deltaYPx)
    ) - widthPx; // assuming circle for stage hotspot

    return { x, y, length, angle, width };
  }

  /**
   * Get height of paths. Supports px only for now.
   * @returns {number} Height in px.
   */
  getPathsHeight() {
    const height = Util.parseCSSLengthProperty(this.paths.getHeight());
    if (!height) {
      return 1;
    }

    if (height.unit === 'px') {
      return height.value;
    }

    return 1; // Fallback
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

  /**
   * Convert px to respective % for map.
   * @param {object} [value] Value to convert.
   * @param {number} [value.x] X value to convert.
   * @param {number} [value.y] Y value to convert.
   * @returns {number} Percentage for map.
   */
  convertToPercent(value = {}) {
    if (typeof value.x === 'number') {
      return value.x * 100 / this.map.getSize().width;
    }

    if (typeof value.y === 'number') {
      return value.y * 100 / this.map.getSize().height;
    }

    return 0;
  }

  /**
   * Resize.
   */
  resize() {
    this.toolbar.blurAll();
    this.updatePaths();
  }

  /**
   * Handle background image loaded.
   * @param {HTMLImageElement} image Background image.
   */
  handleBackgroundImageLoaded(image) {
    this.backgroundImageSize = {
      height: image.naturalHeight,
      width: image.naturalWidth
    };
  }
}
