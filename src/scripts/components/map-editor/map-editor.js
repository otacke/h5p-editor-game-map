import Paths from '@models/paths.js';
import Util from '@services/util.js';
import Dialog from '@components/dialog/dialog.js';
import Map from '@components/map-editor/map/map.js';
import ToolbarGroup from '@components/toolbar/toolbar-group.js';
import ToolbarMain from '@components/toolbar/toolbar-main.js';
import DragNBarWrapper from '@models/drag-n-bar-wrapper.js';
import DnBCalls from './mixins/map-editor-dnb-calls.js';
import PathHandling from './mixins/map-editor-path-handling.js';
import './map-editor.scss';
import { STAGE_TYPES } from './map-elements/stage.js';

export default class MapEditor {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.elements] Stage's parameters.
   * @param {object} [params.elementsFields] Stage's fields.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    Util.addMixins(
      MapEditor, [DnBCalls, PathHandling],
    );

    this.params = Util.extend({
      elements: [],
      paths: [],
    }, params);

    this.params.elements = this.params.elements ?? [];

    this.callbacks = Util.extend({
      onChanged: () => {},
      onTogglePreview: () => {},
    }, callbacks);

    this.mapElements = [];

    this.id = H5P.createUUID();
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-editor');
    this.dom.setAttribute('id', this.id);

    this.map = new Map(
      {
        backgroundColor: this.params.backgroundColor,
      },
      {
        onImageLoaded: (image) => {
          this.handleBackgroundImageLoaded(image);
        },
      },
    );

    this.paths = new Paths(
      {
        map: this.map,
        pathsGroupTemplate: this.params.pathsGroupTemplate,
        paths: this.params.paths,
        pathFields: this.params.pathFields,
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      },
      {
        onPathClicked: (params) => {
          this.handlePathClicked(params);
        },
      },
    );

    this.dialog = new Dialog({ dictionary: this.params.dictionary });

    this.buildDragNBarWrapper();
    this.buildToolbar(this.dnbWrapper.getParentDOM());
    this.dom.append(this.toolbar.getDOM());

    this.dom.appendChild(this.map.getDOM());
    this.dom.appendChild(this.dialog.getDOM());

    this.params.elements.forEach((elementParams) => {
      let type = STAGE_TYPES.stage;
      if (elementParams.specialStageType) {
        type = STAGE_TYPES['special-stage'];
      }

      this.createElement(type, elementParams);
    });

    this.hide();
  }

  /**
   * Build DragNBar wrapper.
   */
  buildDragNBarWrapper() {
    const buttonOptions = [{
      id: 'stage',
      type: STAGE_TYPES.stage,
    },
    {
      id: 'special-stage',
      type: STAGE_TYPES['special-stage'],
    }];

    this.dnbWrapper = new DragNBarWrapper(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        subContentOptions: this.params.subContentOptions,
        buttons: buttonOptions.map((option) => this.createButton(option)),
        dialogContainer: this.getDOM(),
        elementArea: this.map.getDOM(),
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
            this.convertToPercent({ y: y }),
          );
          this.updatePaths({ limit: index });
        },
        createElement: (params) => {
          return this.createElement(params);
        },
      },
    );

    this.dnbWrapper.attach(document.createElement('div'));
  }

  /**
   * Build toolbar.
   * @param {HTMLElement} dnbDOMElement DNB Wrapper DOM element.
   */
  buildToolbar(dnbDOMElement) {
    // Toolbar components
    const contentButtons = new ToolbarGroup(
      {
        dnbDOM: dnbDOMElement,
        a11y: {
          toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelMapElements'),
        },
        ariaControlsId: this.id,
      }, {
        onKeydown: (createdElement) => {
          const element = this.elements.find((element) => element.getDOM() === createdElement);
          if (!element) {
            return;
          }

          this.editElement(element);
        },
      },
    );

    const toolbarButtons = [
      {
        id: 'preview',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonPreview'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonPreview'),
        },
        onClick: () => {
          this.dnbWrapper.blurAll();
          this.callbacks.onTogglePreview();
        },
      },
    ];

    this.actionButtons = new ToolbarGroup({
      buttons: toolbarButtons,
      className: 'h5p-editor-game-map-toolbar-action',
      a11y: {
        toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelActions'),
      },
      ariaControlsId: this.id,
    }, {});

    this.toolbar = new ToolbarMain(
      {
        contentButtonsDOM: contentButtons.getDOM(),
        actionButtonsDOM: this.actionButtons.getDOM(),
      },
    );
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
   * @param {string|null} url URL of image or null
   */
  setMapImage(url) {
    this.map.setImage(url);
  }

  /**
   * Toggle visibility of lives details in stage dialog.
   * @param {boolean} visible Whether the lives details should be visible.
   */
  toggleLivesDetailsVisibility(visible) {
    this.dialog.toggleLivesDetailsVisibility(visible);
  }

  /**
   * Create button for toolbar.
   * @param {object} [params] Parameters.
   * @param {string} params.id Id.
   * @param {string} params.type Type.
   * @returns {object} Button object for DragNBar.
   */
  createButton(params = {}) {
    // Button configuration is set by DragNBar :-/
    return {
      id: params.id,
      title: this.params.dictionary.get(`l10n.toolbarButton-${params.id}`),
      createElement: () => {
        return this.createElement(params.type ?? params.id, {});
      },
    };
  }

  /**
   * Sanitize parameters. Will keep x/y coordinates within boundaries.
   */
  sanitizeParams() {
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return;
    }

    this.params.elements.forEach((elementParams, index) => {
      const telemetry = elementParams.telemetry;

      // Convert percentage values to px.
      const toPxFactor = {

        x: mapSize.width / 100,

        y: mapSize.height / 100,
      };
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

      this.mapElements[index].updateParams({ telemetry: {

        x: xPx * 100 / mapSize.width,

        y: yPx * 100 / mapSize.height,
        height: telemetry.height,
      },
      });
    });
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
    this.dnbWrapper.blurAll();
    this.updatePaths();

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      const mapSize = this.map.getSize();
      if (mapSize.height === 0 || mapSize.width === 0) {
        return;
      }

      this.dom.style.setProperty('--map-height', `${mapSize.height}px`);
      this.dom.style.setProperty('--map-width', `${mapSize.width}px`);
    }, 0);
  }

  /**
   * Handle background image loaded.
   * @param {HTMLImageElement} image Background image.
   */
  handleBackgroundImageLoaded(image) {
    this.backgroundImageSize = {
      height: image.naturalHeight,
      width: image.naturalWidth,
    };
  }

  /**
   * Validate all form elements.
   * @returns {boolean} True, if all elements are valid, else false.
   */
  validate() {
    return this.mapElements.every((element) => this.validateFormChildren(element));
  }

  /**
   * Toggle visibility of map editor.
   * @param {boolean} visible Whether the map editor should be visible.
   */
  toggleVisibility(visible) {
    this.dom.classList.toggle('display-none', !visible);
  }
}
