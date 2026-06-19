import Util from '@services/util.js';
import './stage.scss';

export default class Stage {

  constructor(params = {}) {
    this.params = Util.extend({
    }, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-stage');
  }

  /**
   * Return Stage DOM.
   * @returns {HTMLElement} Stage DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set icon.
   * @param {string} name CSS class name key for icon.
   */
  setIcon(name) {
    this.dom.className = this.dom.className.replace(/icon-\w*/g, '');
    if (name === null) {
      return;
    }

    if (typeof name !== 'string') {
      return;
    }

    this.dom.classList.add(`icon-${name}`);
  }
}
