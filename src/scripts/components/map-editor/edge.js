import './edge.scss';

export default class Edge {

  /**
   * Construct a edge.
   *
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} params.start Start position.
   * @param {object} params.end End position.
   */
  constructor(params = {}) {
    this.params = params;
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-edge');
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
   * Get height from CSS.
   *
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
   *
   * @param {object} [params={}] Parameters.
   * @param {number} params.x Start position x in percent.
   * @param {number} params.y Start position y in percent.
   * @param {number} params.length length in px.
   */
  update(params = {}) {
    if (params === null) {
      return;
    }

    this.thickness = this.thickness || window.getComputedStyle(this.dom);
    this.dom.style.left = `${params.x}%`;
    this.dom.style.top = `${params.y}%`;
    this.dom.style.width = `${params.length}px`;
    this.dom.style.transform = `rotate(${params.angle}rad)`;
  }
}
