import Util from '@services/util';
import Label from './label';
import './map-element.scss';
import { STAGE_TYPES } from './stage.js';

export default class MapElement {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
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
    this.dom.classList.add('h5p-editor-game-map-element');

    H5P.jQuery(this.dom).data('id', this.params.index); // DnB tradeoff

    this.dom.addEventListener('click', (event) => {
      Util.doubleClick(event, () => {
        this.callbacks.onEdited(this);
      });
    });

    const content = this.params.content.getDOM();
    content.classList.add('h5p-editor-game-map-element-content');
    this.dom.appendChild(content);

    this.updateParams(this.params.elementParams);

    if (!this.params.elementParams.specialStageType) {
      this.label = new Label({ text: this.params.elementParams.label });
      this.dom.appendChild(this.label.getDOM());

      this.dom.addEventListener('mouseenter', (event) => {
        this.handleMouseOver(event);
      });
      this.dom.addEventListener('focus', (event) => {
        this.handleMouseOver(event);
      });
      this.dom.addEventListener('mouseleave', () => {
        this.handleMouseOut();
      });
      this.dom.addEventListener('blur', (event) => {
        this.handleMouseOut(event);
      });
    }

    this.form = this.generateForm(
      this.params.elementFields,
      this.params.elementParams,
      params.type
    );
    this.form.$element = H5P.jQuery(this.dom);

    this.createDNBElement();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set index.
   * @param {number} index Index of map element.
   */
  setIndex(index) {
    this.form.$element.data('id', index); // DragNBar compromise
    this.params.index = index;
  }

  /**
   * Get index.
   * @returns {number} index Index of map element.
   */
  getIndex() {
    return this.params.index;
  }

  /**
   * Get form data.
   * @returns {object} Form data.
   */
  getData() {
    return this.form;
  }

  /**
   * Get element parameters.
   * @returns {object} Element parameters.
   */
  getParams() {
    return this.params.elementParams;
  }

  /**
   * Update parameters. Assuming all properties to use percentage.
   * @param {object} [params] Parameters.
   */
  updateParams(params = {}) {
    for (let property in params.telemetry) {
      if (typeof params.telemetry[property] === 'number') {
        params.telemetry[property] = `${params.telemetry[property]}`;
      }

      // Update internal value
      this.params.elementParams.telemetry[property] = params.telemetry[property];

      // Update DOM
      let styleProperty = property;
      if (property === 'x') {
        styleProperty = 'left';
      }
      else if (property === 'y') {
        styleProperty = 'top';
      }
      this.dom.style[styleProperty] = `${params.telemetry[property]}%`;
      this.dom.style.setProperty(
        `--map-element-percentage-${property}`,
        `${params.telemetry[property]}`
      );
    }

    this.label?.setText(this.params.elementParams.label);

    this.callbacks.onChanged(this.params.index, this.params.elementParams);
  }

  /**
   * Remove map element from DOM.
   */
  remove() {
    this.dom.remove();
  }

  /**
   * Create DragNBar element.
   */
  createDNBElement() {
    const dnbElement = this.params.toolbar.add(
      this.getData().$element,
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
   * @param {object} semantics Semantics for form.
   * @param {object} params Parameters for form.
   * @param {string} elementType Type of element.
   * @returns {object} Form object with DOM and H5P widget instances.
   */
  generateForm(semantics, params, elementType) {
    const form = document.createElement('div');

    H5PEditor.processSemanticsChunk(
      semantics,
      params,
      H5P.jQuery(form),
      this.params.globals.get('elementsGroupField')
    );

    // H5PEditor.library widget does not feature an error field. Inject one.
    const library = form.querySelector('.field.library');
    if (library) {
      const errors = document.createElement('div');
      errors.classList.add('h5p-errors');
      library.appendChild(errors);

      const libraryWidget = this.params.globals.get('elementsGroupField')?.children
        .find((child) => child.field.name === 'contentType');

      if (libraryWidget) {
        libraryWidget.changes.push(() => {
          errors.innerHTML = ''; // Erase once a library is selected
        });
      }
    }

    /*
     * We unfortunately cannot remove fields that are not needed for the given
     * type of the element before processSemanticsChunk, because we must not
     * modify the original elementsGroupField and we cannot clone it either,
     * because then we lose the reference to the neighbors fields for the
     * dynamic checkboxes. We instead remove the field instances and DOM
     * elements here.
     */
    const toBeRemoved = {};
    toBeRemoved[STAGE_TYPES['stage']] =
      ['specialStageType'];
    toBeRemoved[STAGE_TYPES['special-stage']] =
      ['canBeStartStage', 'time', 'contentType'];

    const removeIndexes = [];

    // Remove DOM elements
    toBeRemoved[elementType].forEach((fieldName) => {
      // Fetch indexes of field instances from semantics.
      const index = semantics.findIndex((field) => field.name === fieldName);
      if (index !== -1) {
        removeIndexes.push(index);
      }

      this.removeFormFields(form, fieldName);
    });

    const children = this.removeFormInstances(removeIndexes);
    /*
     * The showWhen widget seems to have trouble with being attached to all
     * the different forms of the stages. Introducing custom conditional
     * visibility handling for the specialStageType features here.
     */
    this.applyCustomShowWhenHandling(children, form);

    return {
      form: form,
      children: children
    };
  }

  /**
   * Apply custom conditional visibility handling for specialStageType.
   * @param {object[]} children Editor widget instances.
   * @param {HTMLElement} form Editor form for stage
   */
  applyCustomShowWhenHandling(children, form) {
    children.forEach((child) => {
      if (
        !(child instanceof H5PEditor.Select) ||
        child.field.name !== 'specialStageType'
      ) {
        return;
      }

      child.changes.push(() => {
        this.toggleSpecialStageFields(form, child.value);
      });
      this.toggleSpecialStageFields(form, child.value);
    });
  }

  /**
   * Toggle special stage fields visibility.
   * @param {HTMLElement} form Form.
   * @param {string} specialStageType Value of specialStageType select field.
   */
  toggleSpecialStageFields(form, specialStageType) {
    form.querySelector('.field-name-specialStageExtraLives')?.classList
      .toggle('display-none', specialStageType !== 'extra-life');

    form.querySelector('.field-name-specialStageExtraTime')?.classList
      .toggle('display-none', specialStageType !== 'extra-time');
  }

  /**
   * Remove fields from form. Works in-place on form.
   * @param {HTMLElement} form Form.
   * @param {string} fieldName Field name from semantics.
   */
  removeFormFields(form, fieldName) {
    let domElement = form.querySelector(`.field-name-${fieldName}`);
    if (!domElement) {
      /*
       * Workaround for library widget that does not have a field name in
       * classname. Beware though: This workaround is fine, because the
       * content's library field should be the first one. If some other
       * library field is added before, this will break.
       */
      if (fieldName === 'contentType') {
        domElement = form.querySelector('.field.library');
      }
    }
    if (domElement) {
      domElement.remove();
    }
  }

  /**
   * Remove H5P editor widget instances from form.
   * @param {number[]} removeIndexes Indexes of instances to remove.
   * @returns {object[]} Remaining instances.
   */
  removeFormInstances(removeIndexes) {
    const children = this.params.globals.get('elementsGroupField').children
      .map((child) => child);

    for (let i = removeIndexes.length - 1; i >= 0; i--) {
      children.splice(removeIndexes[i], 1);
    }

    return children;
  }

  /**
   * Handle mouseover.
   * @param {Event} event Event that triggered.
   */
  handleMouseOver(event) {
    if (Util.supportsTouch()) {
      return;
    }

    const fontSize = this.params.content.getDOM()
      .getBoundingClientRect().height / 2; // Half height of stage element

    this.label?.setFontSize(`${fontSize}px`);
    this.label?.show({ skipDelay: event instanceof FocusEvent });
  }

  /**
   * Handle mouseout.
   */
  handleMouseOut() {
    if (Util.supportsTouch()) {
      return;
    }

    this.label.hide();
  }
}

/** @constant {number} DEFAULT_SIZE_PX Default width/height in px */
MapElement.DEFAULT_SIZE_PX = 42;
