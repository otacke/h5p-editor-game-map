import Util from '@services/util.js';
import './toolbar-main.scss';

export default class ToolbarMain {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {HTMLElement} [params.contentButtonsDOM] Button objects for DnB.
   */
  constructor(params = {}) {
    this.params = Util.extend({
    }, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-toolbar-main');

    this.dom.append(this.params.contentButtonsDOM);
    this.dom.append(this.params.actionButtonsDOM);
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
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }
}
