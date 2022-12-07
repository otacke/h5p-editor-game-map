import Dictionary from '@services/dictionary';
import Util from '@services/util';
import Dialog from './dialog';
import Map from './map';
import MapElement from './map-element';
import Toolbar from './toolbar';
import './map-editor.scss';

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
    this.dom.classList.add('h5p-game-map-editor');

    this.map = new Map({}, {
      onImageLoaded: (image) => {
        this.handleBackgroundImageLoaded(image);
      }
    });

    this.toolbar = new Toolbar(
      {
        buttons: [this.createButton('stage')],
        mapContainer: this.map.getDOM(),
        dialogContainer: this.dom
      },
      {
        onStoppedMoving: (index, x, y) => {
          this.updateMapElement(index, x, y);
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
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    // TODO
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
    // Sanitize with default values
    const defaultWidth = (this.params.stages.length) ?
      this.params.stages[0].telemetry.width :
      `${this.convertToPercent({ x: MapElement.DEFAULT_SIZE_PX })}`;

    const defaultHeight = (this.params.stages.length) ?
      this.params.stages[0].telemetry.height :
      `${this.convertToPercent({ y: MapElement.DEFAULT_SIZE_PX })}`;

    const numberUnnamedStages = this.params.stages.filter((stage) => {
      return stage.id.indexOf(`${Dictionary.get('l10n.unnamedStage')} `) === 0;
    }).length + 1;

    const elementParams = Util.extend({
      id: `${Dictionary.get('l10n.unnamedStage')} ${numberUnnamedStages}`,
      telemetry: {
        x: `${50 - this.convertToPercent({ x: MapElement.DEFAULT_SIZE_PX / 2 })}`,
        y: `${50 - this.convertToPercent({ y: MapElement.DEFAULT_SIZE_PX / 2 })}`,
        width: defaultWidth,
        height: defaultHeight
      },
      neighbors: []
    }, params);

    const mapElement = new MapElement(
      {
        index: this.mapElements.length,
        elementParams: elementParams,
        elementFields: this.params.stageFields,
        toolbar: this.toolbar,
        contentClass: 'h5p-game-map-element-content-stage'
      },
      {
        onEdited: (mapElement) => {
          this.edit(mapElement);
        },
        onRemoved: (mapElement) => {
          this.remove(mapElement);
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

    return mapElement.getJQuery();
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
    this.params.stageFields[3].options = this.params.stages
      .map((elementParams, index) => {
        return { value: `${index}`, label: elementParams.id };
      });

    // Tell list widget this stage's id to be excluded
    // TODO: Clean up array selection
    mapElement.form.children[3].setActive({
      id: `${mapElement.getIndex()}`,
      onNeighborsChanged: (id, neighbors) => {
        this.updateNeighbors(id, neighbors);
      }
    });

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

          return child.validate();
        });

        if (isValid) {
          this.toolbar.show();
          this.map.show();
          this.callbacks.onChanged(this.params.stages);
        }

        return isValid;
      },
      removeCallback: () => {
        this.toolbar.show();
        this.map.show();

        this.remove(mapElement);
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
   * Remove map element.
   *
   * @param {MapElement} mapElement Map element to be removed.
   */
  remove(mapElement) {
    const index = mapElement.getIndex();

    // Remove element
    mapElement.remove();
    this.mapElements.splice(index, 1);
    this.params.stages.splice(index, 1);

    // Re-index elements
    this.mapElements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.callbacks.onChanged(this.params.stages);
  }

  /**
   * Bring map element to front.
   *
   * @param {MapElement} mapElement Map element to be brought to front.
   */
  bringToFront(mapElement) {
    const oldZ = this.params.stages.indexOf(mapElement.getParams());
    this.params.stages.push(this.params.stages.splice(oldZ, 1)[0]);

    this.map.appendElement(mapElement.getDOM());
  }

  /**
   * Send map element to back
   *
   * @param {MapElement} mapElement Map element to be sent to back.
   */
  sendToBack(mapElement) {
    const oldZ = this.params.stages.indexOf(mapElement.getParams());
    this.params.stages.unshift(this.params.stages.splice(oldZ, 1)[0]);

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
  }

  /**
   * Handle background image loaded.
   *
   * @param {HTMLImageElement} image Background image.
   */
  handleBackgroundImageLoaded(image) {
    if (
      this.backgroundImageSize && (
        this.backgroundImageSize.height !== image.naturalHeight ||
        this.backgroundImageSize.width !== image.naturalWidth
      )
    ) {

      /*
       * Old stages should not be deleted when the background image is changed.
       * Scale stages according to images' aspect ratio difference to retain
       * the current visible stage size
       */
      const scaleFactor = image.naturalWidth / image.naturalHeight *
        this.backgroundImageSize.height / this.backgroundImageSize.width;

      this.mapElements.forEach((element) => {
        const elementParams = element.getParams();

        element.updateParams({telemetry: {
          height: `${parseFloat(elementParams.telemetry.height) * scaleFactor}`
        }});
      });
    }

    this.backgroundImageSize = {
      height: image.naturalHeight,
      width: image.naturalWidth
    };
  }
}
