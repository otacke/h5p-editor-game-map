import Edges from '@models/edges';
import Dictionary from '@services/dictionary';
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
   * @param {object} [params={}] Parameters.
   * @param {object} [params.stages] Stage's parameters.
   * @param {object} [params.stageFields] Stage's fields.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      stages: []
    }, params);

    this.params.stages = this.params.stages ?? [];

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

    this.edges = new Edges({ map: this.map });

    this.toolbar = new Toolbar(
      {
        buttons: [this.createButton('stage')],
        mapContainer: this.map.getDOM(),
        dialogContainer: this.dom
      },
      {
        onStoppedMoving: (index, x, y) => {
          this.updateMapElement(index, x, y);
          this.updateEdges({ limit: index });
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
          this.updateEdges({ limit: index });
        }
      }
    );

    this.dialog = new Dialog();

    this.dom.appendChild(this.toolbar.getDOM());
    this.dom.appendChild(this.map.getDOM());
    this.dom.appendChild(this.dialog.getDOM());

    this.params.stages.forEach((elementParams) => {
      this.createElement(elementParams);
    });

    this.hide();
  }

  /**
   * Get DOM.
   *
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
      this.updateEdges();
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
   *
   * @param {string} url URL of image.
   */
  setMapImage(url) {
    this.map.setImage(url);
  }

  /**
   * Create button for toolbar.
   *
   * @param {string} id Id.
   * @returns {object} Button object for DragNBar.
   */
  createButton(id) {
    // Button configuration is set by DragNBar :-/
    return {
      id: id,
      title: Dictionary.get(`l10n.toolbarButton-${id}`),
      createElement: () => {
        return this.createElement();
      }
    };
  }

  /**
   * Create map element.
   *
   * @param {object} [params] Element parameters as used in semantics.json.
   * @returns {H5P.jQuery} Element DOM. JQuery required by DragNBar.
   */
  createElement(params) {
    // When other elements need to be added later on, create separate models

    const numberUnnamedStages = this.params.stages.filter((stage) => {
      return stage.id.indexOf(`${Dictionary.get('l10n.unnamedStage')} `) === 0;
    }).length + 1;

    const stage = new Stage({
      id: `${Dictionary.get('l10n.unnamedStage')} ${numberUnnamedStages}`
    });

    const newContent = stage;

    const elementParams = Util.extend({
      id: `${Dictionary.get('l10n.unnamedStage')} ${numberUnnamedStages}`,
      content: newContent,
      telemetry: {
        x: `${50 - this.convertToPercent({ x: newContent.getDefaultSize().width / 2 })}`,
        y: `${50 - this.convertToPercent({ y: newContent.getDefaultSize().height / 2 })}`,
        width: `${newContent.getDefaultSize().width}`,
        height: `${newContent.getDefaultSize().height}`
      },
      neighbors: []
    }, params);

    const mapElement = new MapElement(
      {
        index: this.mapElements.length,
        content: newContent,
        elementParams: elementParams,
        elementFields: this.params.stageFields,
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
          this.params.stages[index] = elementParams;
          this.callbacks.onChanged(this.params.stages);
        }
      }
    );

    this.mapElements.push(mapElement);
    this.map.appendElement(mapElement.getDOM());

    return mapElement.getData().$element;
  }

  /**
   * Update map element.
   *
   * @param {number} index Map element index.
   * @param {number} x X position as percentage value.
   * @param {number} y Y position as percentage value.
   */
  updateMapElement(index, x, y) {
    this.mapElements[index].updateParams({ telemetry: { x: x, y: y } });
  }

  /**
   * Edit map element.
   *
   * @param {MapElement} mapElement Map element to be edited.
   */
  edit(mapElement) {
    this.toolbar.hide();
    this.map.hide();

    // Make all stages available to be neighbors
    this.params.stageFields
      .find((field) => field.name === 'neighbors')
      .options = this.params.stages
        .map((elementParams, index) => {
          return { value: `${index}`, label: elementParams.id };
        });

    const neighbors = H5PEditor.findField('neighbors', mapElement.form);
    if (neighbors) {
      // Tell list widget this stage's id to be excluded
      neighbors.setActive({
        id: `${mapElement.getIndex()}`,
        neighbors: this.params.stages[mapElement.getIndex()].neighbors,
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
                errors.innerHTML = `<p>${Dictionary.get('l10n.contentRequired')}</p>`;
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
          this.updateEdges();
          this.callbacks.onChanged(this.params.stages);
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
   *
   * @param {string} id Id of stage that was changed.
   * @param {string[]} neighbors List of neighbors that stage should have.
   */
  updateNeighbors(id, neighbors) {
    this.params.stages.forEach((stage, index) => {
      if (neighbors.includes(`${index}`)) {
        if (!stage.neighbors.includes(id)) {
          stage.neighbors.push(id);
          // Sorting not really necessary, but why not ...
          stage.neighbors.sort((a, b) => {
            return parseInt(a) - parseInt(b);
          });
        }
      }
      else {
        if (stage.neighbors.includes(id)) {
          const position = stage.neighbors.indexOf(id);
          stage.neighbors.splice(position, 1);
        }
      }
    });

    this.callbacks.onChanged(this.params.stages);
  }

  /**
   * Sanitize parameters. Will keep x/y coordinates within boundaries.
   */
  sanitizeParams() {
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return;
    }

    this.params.stages.forEach((elementParams, index) => {
      let xPx = parseFloat(elementParams.telemetry.x) / 100 * mapSize.width;
      let yPx = parseFloat(elementParams.telemetry.y) / 100 * mapSize.height;

      xPx = Math.min(xPx, mapSize.width - elementParams.telemetry.width);
      xPx = Math.max(0, xPx);
      yPx = Math.min(yPx, mapSize.height - elementParams.telemetry.height);
      yPx = Math.max(0, yPx);

      this.mapElements[index].updateParams({telemetry: {
        x: this.convertToPercent({x: xPx}),
        y: this.convertToPercent({y: yPx})
      }
      });
    });
  }

  /**
   * Update all edges.
   *
   * @param {object} [params={}] Parameters.
   * @param {number} [params.limit] Number of stage that needs updating only.
   */
  updateEdges(params = {}) {
    // Intentionally not creating one long chain here.

    let requiredEdges = H5P.cloneObject(this.params.stages);

    // Determine from-to combination without vice verse pair to check
    requiredEdges = requiredEdges.reduce((edges, current, index) => {
      current.neighbors.forEach((neighbor) => {
        if (
          !edges.includes(`${index}-${neighbor}`) &&
          !edges.includes(`${neighbor}-${index}`)
        ) {
          edges.push(`${index}-${neighbor}`);
        }
      });
      return edges;
    }, []);

    // Create update list for Edges
    requiredEdges = requiredEdges.map((combo) => {
      const stages = combo.split('-');

      // Don't compute telemetry values for edges that have not changed
      let edgeTelemetry = null;
      if (
        typeof params.limit !== 'number' ||
        parseInt(stages[0]) === params.limit ||
        parseInt(stages[1]) === params.limit
      ) {
        edgeTelemetry = this.computeEdgeTelemetry({
          from: this.params.stages[parseInt(stages[0])].telemetry,
          to: this.params.stages[parseInt(stages[1])].telemetry
        });
      }

      return {
        from: parseInt(stages[0]),
        to: parseInt(stages[1]),
        edgeTelemetry: edgeTelemetry
      };
    });

    this.edges.update({ edges: requiredEdges });
  }

  /**
   * Compute edge telemetry.
   *
   * @param {object} [params = {}] Parameters.
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
   * @returns {object} Telemetry date for an edge
   */
  computeEdgeTelemetry(params = {}) {
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return null;
    }

    const fromXPx = parseFloat(params.from.x) / 100 * mapSize.width;
    const fromYPx = parseFloat(params.from.y) / 100 * mapSize.height;
    const toXPx = parseFloat(params.to.x) / 100 * mapSize.width;
    const toYPx = parseFloat(params.to.y) / 100 * mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    const offsetToBorderPx = {
      x: parseFloat(params.from.width) / 2 * Math.cos(angle),
      y: parseFloat(params.from.height) / 2 * Math.sin(angle)
    };

    const offsetEdgeStrokePx = this.getEdgesHeight() / 2;

    const x = parseFloat(params.from.x) + this.convertToPercent({ x:
      parseFloat(params.from.width) / 2 + // for centering in hotspot
      offsetToBorderPx.x // for starting at hotspot border
    });

    const y = parseFloat(params.from.y) + this.convertToPercent({ y:
      parseFloat(params.from.height) / 2 + // for centering in hotspot
      offsetToBorderPx.y - // for starting at hotspot border
      offsetEdgeStrokePx // for compensating edge stroke width
    });

    // Good old Pythagoras
    const length = Math.sqrt(
      Math.abs(deltaXPx) * Math.abs(deltaXPx) +
      Math.abs(deltaYPx) * Math.abs(deltaYPx)
    ) - params.from.width; // assuming circle for hotspot

    return { x, y, length, angle };
  }

  /**
   * Get height of edges. Supports px only for now.
   *
   * @returns {number} Height in px.
   */
  getEdgesHeight() {
    const height = Util.parseCSSLengthProperty(this.edges.getHeight());
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
   *
   * @param {MapElement} mapElement Map element to be removed.
   */
  removeIfConfirmed(mapElement) {
    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: Dictionary.get('l10n.confirmationDialogRemoveHeader'),
      dialogText: Dictionary.get('l10n.confirmationDialogRemoveDialog'),
      cancelText: Dictionary.get('l10n.confirmationDialogRemoveCancel'),
      confirmText: Dictionary.get('l10n.confirmationDialogRemoveConfirm')
    });
    this.deleteDialog.on('confirmed', () => {
      this.remove(mapElement);
    });

    this.deleteDialog.appendTo(this.dom.closest('.field-name-gamemapSteps'));
    this.deleteDialog.show();
  }

  /**
   * Remove map element.
   *
   * @param {MapElement} mapElement Map element to be removed.
   */
  remove(mapElement) {
    const removeIndex = mapElement.getIndex();

    // Remove from neigbors and re-index rest
    this.params.stages.forEach((stage) => {
      if (stage.neighbors.includes(`${removeIndex}`)) {
        // Remove map element to be removed from neighbors
        stage.neighbors.splice(stage.neighbors.indexOf(`${removeIndex}`), 1);
      }

      // Re-index neighbors
      stage.neighbors = stage.neighbors.map((neighbor) => {
        const neighborNumber = parseInt(neighbor);
        return (neighborNumber < removeIndex) ?
          neighbor :
          `${parseInt(neighbor) - 1}`;
      });
    });

    // Remove element
    mapElement.remove();
    this.mapElements.splice(removeIndex, 1);
    this.params.stages.splice(removeIndex, 1);

    // Re-index elements
    this.mapElements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.callbacks.onChanged(this.params.stages);

    this.updateEdges();
  }

  /**
   * Bring map element to front.
   *
   * @param {MapElement} mapElement Map element to be brought to front.
   */
  bringToFront(mapElement) {
    /*
     * If position in this.params.stages becomes relevant, move element there
     * and re-index everything
     */
    this.map.appendElement(mapElement.getDOM());
  }

  /**
   * Send map element to back
   *
   * @param {MapElement} mapElement Map element to be sent to back.
   */
  sendToBack(mapElement) {
    /*
     * If position in this.params.stages becomes relevant, move element there
     * and re-index everything
     */
    this.map.prependElement(mapElement.getDOM());
  }

  /**
   * Convert px to respective % for map.
   *
   * @param {object} [value={}] Value to convert.
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
    this.updateEdges();
  }

  /**
   * Handle background image loaded.
   *
   * @param {HTMLImageElement} image Background image.
   */
  handleBackgroundImageLoaded(image) {
    this.backgroundImageSize = {
      height: image.naturalHeight,
      width: image.naturalWidth
    };
  }
}
