import Util from '@services/util';
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
   *
   * @returns {HTMLElement} Stage DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get default size in px.
   *
   * @returns {object} Default size (width + height) in px.
   */
  getDefaultSize() {
    return Stage.DEFAULT_SIZE_PX;
  }
}

Stage.DEFAULT_SIZE_PX = { width: 42, height: 42 };
