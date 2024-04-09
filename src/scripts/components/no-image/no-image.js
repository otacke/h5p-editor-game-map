import Util from '@services/util.js';
import './no-image.scss';

export default class NoImage {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClick] Callback for click on button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onClick: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-no-image');

    const image = document.createElement('div');
    image.classList.add('h5p-no-image-icon');
    this.dom.appendChild(image);

    const title = document.createElement('div');
    title.classList.add('h5p-no-image-title');
    title.innerText = this.params.dictionary.get('l10n.noBackgroundImage');
    this.dom.appendChild(title);

    const message = document.createElement('div');
    message.classList.add('h5p-no-image-message');
    message.innerText = message.innerText =
      this.params.dictionary.get('l10n.noBackgroundImageMessage');
    this.dom.appendChild(message);

    const button = document.createElement('button');
    button.classList.add('h5p-no-image-button');
    button.classList.add('h5p-joubelui-button');
    button.innerText = this.params.dictionary.get('l10n.back');
    button.addEventListener('click', () => {
      this.callbacks.onClick();
    });
    this.dom.appendChild(button);

    this.hide();
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
