import Util from '@services/util.js';
import UtilDOM from '@services/util-dom.js';
import UtilH5P from '@services/util-h5p.js';
import Label from './label.js';
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
    this.params = Util.extend({}, params);

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
      UtilDOM.doubleClick(event, () => {
        this.callbacks.onEdited(this);
      });
    });

    const content = this.params.content.getDOM();
    content.classList.add('h5p-editor-game-map-element-content');
    this.dom.appendChild(content);

    this.updateParams(this.params.elementParams);

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

    const template = this.params.elementsGroupTemplate;
    this.formParent = new H5PEditor.widgets[template.type](
      template.parent, template.field, template.params, template.setValue
    );

    H5PEditor.processSemanticsChunk(
      semantics,
      params,
      H5P.jQuery(form),
      this.formParent
    );

    // H5PEditor.library widget does not feature an error field. Inject one.
    const library = form.querySelector('.field.library');
    if (library) {
      const errors = document.createElement('div');
      errors.classList.add('h5p-errors');
      library.appendChild(errors);

      const libraryWidget = this.formParent?.children.find((child) => child.field.name === 'contentType');
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
    toBeRemoved[STAGE_TYPES.stage] = [
      'specialStageType',
      'specialStageExtraLives',
      'specialStageExtraTime',
      'specialStageLinkURL',
      'specialStageLinkTarget',
      'alwaysVisible',
      'overrideSymbol'
    ];

    toBeRemoved[STAGE_TYPES['special-stage']] = [
      'canBeStartStage',
      'time',
      'contentslist'
    ];

    const children = UtilH5P.removeFromForm(toBeRemoved[elementType], semantics, form, this.formParent.children);

    if (elementType === STAGE_TYPES['special-stage']) {
      /*
      * The showWhen widget seems to have trouble with being attached to all
      * the different forms of the stages. Introducing custom conditional
      * visibility handling for the specialStageType features here.
      */
      this.applyCustomShowWhenHandling(children, form);
    }

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

    form.querySelector('.field-name-specialStageLinkURL')?.classList
      .toggle('display-none', specialStageType !== 'link');

    form.querySelector('.field-name-specialStageLinkTarget')?.classList
      .toggle('display-none', specialStageType !== 'link');
  }

  /**
   * Remove H5P editor widget instances from form.
   * @param {number[]} removeIndexes Indexes of instances to remove.
   * @returns {object[]} Remaining instances.
   */
  removeFormInstances(removeIndexes) {
    const children = [...this.formParent.children];

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
    if (UtilDOM.supportsTouch()) {
      return;
    }

    const fontSize = this.params.content.getDOM()
      // eslint-disable-next-line no-magic-numbers
      .getBoundingClientRect().height / 2; // Half height of stage element

    this.label?.setFontSize(`${fontSize}px`);
    this.label?.show({ skipDelay: event instanceof FocusEvent });
  }

  /**
   * Handle mouseout.
   */
  handleMouseOut() {
    if (UtilDOM.supportsTouch()) {
      return;
    }

    this.label.hide();
  }
}
