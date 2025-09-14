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

/**
 * @constant {object} DEFAULT_SIZE_PERCENT Size or stage element.
 * Beware that height will need to be be adjusted to canvas ratio. Default value
 * of 4.375% is compromise. Feels large on 1920 wide screens, but still leaving
 * 42px for good a11y on 960 wide screens.
 */
export const DEFAULT_SIZE_PERCENT = { width: 4.375, height: 4.375 };

/** @constant {object} STAGE_TYPES types lookup */
export const STAGE_TYPES = {
  'stage': 0,
  'special-stage': 1,
};
