import Util from '@services/util';
import './map.scss';

export default class Map {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onImageLoaded: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-editor-map');

    this.image = document.createElement('img');
    this.image.classList.add('h5p-game-map-editor-map-background-image');
    this.image.addEventListener('load', () => {
      this.callbacks.onImageLoaded(this.image);
    });
    if (this.params.backgroundImage) {
      this.image.src = this.params.backgroundImage;
    }
    this.dom.appendChild(this.image);

    this.stageWrapper = document.createElement('div');
    this.stageWrapper.classList.add('h5p-game-map-editor-map-stage-wrapper');
    this.dom.appendChild(this.stageWrapper);
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

  /**
   * Get map size.
   *
   * @returns {object} Height and width of map.
   */
  getSize() {
    const clientRect = this.dom.getBoundingClientRect();
    return { height: clientRect.height, width: clientRect.width };
  }

  /**
   * Set map background image.
   *
   * @param {string} url URL of image.
   */
  setImage(url) {
    if (typeof url !== 'string') {
      delete this.image.src;
      return;
    }

    this.image.src = url;
  }

  /**
   * Append to DOM.
   *
   * @param {HTMLElement} dom DOM element.
   */
  appendElement(dom) {
    this.stageWrapper.appendChild(dom);
  }

  /**
   * Prepend to DOM.
   *
   * @param {HTMLElement} dom DOM element.
   */
  prependElement(dom) {
    this.stageWrapper.prepend(dom);
  }
}
