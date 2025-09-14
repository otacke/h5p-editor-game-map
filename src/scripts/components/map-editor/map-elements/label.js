import Util from '@services/util.js';
import './label.scss';

/** @constant {number} VISIBILITY_CHANGE_DELAY_MS Delay for visibility change. */
const VISIBILITY_CHANGE_DELAY_MS = 10;

export default class Label {

  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      position: 'bottom',
    }, params);

    // Label
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-stage-label-container');
    this.dom.classList.add(this.params.position);

    const label = document.createElement('div');
    label.classList.add('h5p-game-map-stage-label');
    this.dom.appendChild(label);

    this.labelInner = document.createElement('div');
    this.labelInner.classList.add('h5p-game-map-stage-label-inner');
    this.labelInner.innerText = this.params.text;
    label.appendChild(this.labelInner);

    this.hide();
  }

  /**
   * Get label DOM.
   * @returns {HTMLElement} Label DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set text.
   * @param {string} text Text.
   */
  setText(text) {
    if (typeof text !== 'string') {
      return;
    }

    this.params.text = text;
    this.labelInner.innerText = this.params.text;
  }

  /**
   * Set font size
   * @param {string} value CSS value for font size.
   */
  setFontSize(value) {
    this.dom.style.fontSize = value;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isTouch] If true, was called by touch device.
   * @param {boolean} [params.skipDelay] If true, will immediately show label.
   */
  show(params = {}) {
    if (this.isShowing()) {
      return;
    }

    if (!this.params.text) {
      return;
    }

    this.dom.classList.toggle('touch-device', params.isTouch || false);

    if (params.skipDelay) {
      this.dom.classList.remove('visibility-hidden');
    }
    else {
      window.setTimeout(() => {
        this.dom.classList.remove('visibility-hidden');
      }, VISIBILITY_CHANGE_DELAY_MS);
    }

    this.dom.classList.remove('display-none');

    this.showing = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('visibility-hidden');
    window.setTimeout(() => {
      this.dom.classList.add('display-none');
    }, 0);
    this.showing = false;
  }

  /**
   * Determine whether label is showing.
   * @returns {boolean} True, if label is showing. Else false.
   */
  isShowing() {
    return this.showing;
  }
}
