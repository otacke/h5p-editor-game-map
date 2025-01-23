import Util from '@services/util.js';

import './path.scss';

export default class Path {
  /**
   * Construct a path.
   * @class
   * @param {object} [params] Parameters.
   * @param {number} params.from Start stage for path.
   * @param {number} params.to Target stage for path.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      pathParams: {
        customVisuals: {}
      },
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
    }, callbacks);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-editor-game-map-path');

    this.dom.addEventListener('click', () => {
      this.callbacks.onClicked(this.form);
    });

    this.form = this.generateForm(
      this.params.pathFields,
      this.params.pathParams
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
   * Get height from CSS.
   * @returns {string} Defined height.
   */
  getHeight() {
    return window.getComputedStyle(this.dom).getPropertyValue('border-top-width');
  }

  /**
   * Remove.
   */
  remove() {
    this.dom.remove();
  }

  /**
   * Update telemetry.
   * @param {object} [params] Parameters.
   * @param {number} params.x Start position x in percent.
   * @param {number} params.y Start position y in percent.
   * @param {number} params.length length in px.
   */
  updateTelemetry(params = {}) {
    if (params === null) {
      return;
    }

    for (let property in params) {
      let styleProperty = property;
      let styleValue = '';

      if (property === 'x') {
        styleProperty = 'left';
        styleValue = `${params[property]}%`;
      }
      else if (property === 'y') {
        styleProperty = 'top';
        styleValue = `${params[property]}%`;
      }
      else if (property === 'length') {
        styleProperty = 'width';
        styleValue = `${params[property]}px`;
      }
      else if (property === 'angle') {
        styleProperty = 'transform';
        styleValue = `rotate(${params[property]}rad`;
      }
      else if (property === 'width') {
        styleProperty = 'borderTopWidth';
        styleValue = `${params[property]}px`;
      }

      this.dom.style[styleProperty] = styleValue;
    }
  }

  /**
   * Get params.
   * @returns {object} Parameters.
   */
  getParams() {
    return this.params.pathParams;
  }

  /**
   * Update telemetry.
   * @param {object} [params] Parameters.
   * @param {number} params.from Start stage for path.
   * @param {number} params.to Target stage for path.
   * @param {string} params.colorPath Color for path.
   * @param {string} params.pathWidth Width for path.
   * @param {string} params.pathStyle Style for path.
   */
  updateParams(params = {}) {
    if (params === null) {
      return;
    }

    for (let property in params) {
      if (property === 'from' && typeof params[property] === 'number') {
        this.params.pathParams.from = params[property];
      }
      else if (property === 'to' && typeof params[property] === 'number') {
        this.params.pathParams.to = params[property];
      }
      else if (property === 'visualsType' && typeof params[property] === 'string') {
        this.params.pathParams.visualsType = params[property];
      }
      else if (property === 'colorPath' && typeof params[property] === 'string') {
        this.params.pathParams.customVisuals.colorPath = params[property];
      }
      else if (property === 'pathWidth' && typeof params[property] === 'string') {
        this.params.pathParams.customVisuals.pathWidth = params[property];
      }
      else if (property === 'pathStyle' && typeof params[property] === 'string') {
        this.params.pathParams.customVisuals.pathStyle = params[property];
      }

      const ariaLabel = this.params.dictionary.get('a11y.pathFromTo')
        .replace('@from', this.params.pathParams.from + 1)
        .replace('@to', this.params.pathParams.to + 1);
      this.dom.setAttribute('aria-label', ariaLabel);
    }

    if (this.params.pathParams.visualsType === 'custom') {
      const visuals = this.params.pathParams.customVisuals;
      if (visuals.colorPath) {
        this.dom.style.setProperty('--editor-fields-visual-paths-style-colorPath', visuals.colorPath);
      }
      if (visuals.pathStyle) {
        this.dom.style.setProperty('--editor-fields-visual-paths-style-pathStyle', visuals.pathStyle);
      }
      if (visuals.pathWidth) {
        this.dom.style.setProperty('--editor-fields-visual-paths-style-pathWidth', visuals.pathWidth);
      }
    }
  }

  /**
   * Generate form.
   * @param {object} semantics Semantics for form.
   * @param {object} params Parameters for form.
   * @returns {object} Form object with DOM and H5P widget instances.
   */
  generateForm(semantics, params) {
    const form = document.createElement('div');

    const template = this.params.globals.get('pathsGroupTemplate');
    const parent = new H5PEditor.widgets[template.type](
      template.parent, template.field, template.params, template.setValue
    );

    H5PEditor.processSemanticsChunk(
      semantics,
      params,
      H5P.jQuery(form),
      parent
    );

    return {
      form: form,
      children: parent.children
    };
  }
}
