import Globals from '@services/globals';
import Util from '@services/util';
import './map-element.scss';

export default class MapElement {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onClick] Callback for click on button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onEdited: () => {},
      onRemoved: () => {},
      onBroughtToFront: () => {},
      onSentToBack: () => {},
      onChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-element');
    if (typeof this.params.elementClass === 'string') {
      this.dom.classList.add(this.params.elementClass);
    }
    H5P.jQuery(this.dom).data('id', this.params.id); // TODO: How to do this in vanilla?
    H5P.jQuery(this.dom).dblclick(() => { // TODO: Replace with custom function
      this.callbacks.onEdited(this);
    });

    this.content = document.createElement('div');
    this.content.classList.add('h5p-game-map-element-content');
    if (typeof this.params.contentClass === 'string') {
      this.content.classList.add(this.params.contentClass);
    }
    this.dom.appendChild(this.content);

    this.updateParams(this.params.elementParams);

    this.form = this.generateForm(this.params.elementFields, params.elementParams);
    this.form.$element = H5P.jQuery(this.dom);

    this.createDNBElement();
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  setID(id) {
    this.form.$element.data('id', id); // TODO: vanilla
    this.params.id = id;
  }

  getID() {
    return this.params.id;
  }

  getData() {
    return this.form;
  }

  getJQuery() {
    return this.form.$element;
  }

  getParams() {
    return this.params.elementParams;
  }

  updateParams(elementParams = {}) {
    if (typeof elementParams.telemetry?.x === 'number') {
      elementParams.telemetry.x = `${elementParams.telemetry.x}`;
    }
    if (typeof elementParams.telemetry?.y === 'number') {
      elementParams.telemetry.y = `${elementParams.telemetry.y}`;
    }
    if (typeof elementParams.telemetry?.width === 'number') {
      elementParams.telemetry.width = `${elementParams.telemetry.width}`;
    }
    if (typeof elementParams.telemetry?.height === 'number') {
      elementParams.telemetry.height = `${elementParams.telemetry.height}`;
    }

    // TODO: Make sure that values stay in range of what map allows

    if (typeof elementParams.telemetry?.x === 'string') {
      this.params.elementParams.telemetry.x = elementParams.telemetry.x;
      this.dom.style.left = `${elementParams.telemetry.x}%`;
    }

    if (typeof elementParams.telemetry?.y === 'string') {
      this.params.elementParams.telemetry.y = elementParams.telemetry.y;
      this.dom.style.top = `${elementParams.telemetry.y}%`;
    }

    if (typeof elementParams.telemetry?.width === 'string') {
      this.params.elementParams.telemetry.width = elementParams.telemetry.width;
      this.dom.style.width = `${elementParams.telemetry.width}%`;
    }

    if (typeof elementParams.telemetry?.height === 'string') {
      this.params.elementParams.telemetry.height = elementParams.telemetry.height;
      this.dom.style.height = `${elementParams.telemetry.height}%`;
    }

    this.callbacks.onChanged(this.params.id, this.params.elementParams);
  }

  remove() {
    this.dom.remove();
  }

  /**
   * Create DragNBar element.
   */
  createDNBElement() {
    const dnbElement = this.params.toolbar.add(
      this.getJQuery(),
      '',
      { disableResize: true, lock: true }
    );

    dnbElement.contextMenu.on('contextMenuEdit', () => {
      this.callbacks.onEdited(this);
    });

    dnbElement.contextMenu.on('contextMenuRemove', () => {
      dnbElement.blur();
      this.callbacks.onRemoved(this);
    });

    dnbElement.contextMenu.on('contextMenuBringToFront', () => {
      this.callbacks.onBroughtToFront(this);
    });

    dnbElement.contextMenu.on('contextMenuSendToBack', () => {
      this.callbacks.onSentToBack(this);
    });
  }

  /**
   * Generate form.
   *
   * @param {object} semantics Semantics for form.
   * @param {object} params Parameters for form.
   * @returns {object} Form object.
   */
  generateForm(semantics, params) {
    const form = document.createElement('div');

    H5PEditor.processSemanticsChunk(
      semantics, params, H5P.jQuery(form), Globals.get('stagesGroupField')
    );

    // H5PEditor.library widget does not feature an error field. Inject one.
    const library = form.querySelector('.field.library');
    if (library) {
      const errors = document.createElement('div');
      errors.classList.add('h5p-errors');
      library.appendChild(errors);

      // TODO: Select dynamically
      Globals.get('stagesGroupField').children[2].changes.push(() => {
        errors.innerHTML = ''; // Erase once a library is selected
      });
    }

    return {
      form: form,
      children: Globals.get('stagesGroupField').children
    };
  }
}

/** @constant {number} DEFAULT_SIZE_PX Default width/height in px */
MapElement.DEFAULT_SIZE_PX = 42;
