import './path.scss';

export default class Path {
  /**
   * Construct a path.
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-path');
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
  update(params = {}) {
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
}
