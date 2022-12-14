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
    return Stage.DEFAULT_SIZE_PERCENT;
  }
}

/**
 * @constant {object} DEFAULT_SIZE_PERCENT Size or stage element.
 * Beware that height will need to be be adjusted to canvas ratio. Default value
 * of 4.375% is compromise. Feels large on 1920 wide screens, but still leaving
 * 42px for good a11y on 960 wide screens.
 */
Stage.DEFAULT_SIZE_PERCENT = { width: 4.375, height: 4.375 };
