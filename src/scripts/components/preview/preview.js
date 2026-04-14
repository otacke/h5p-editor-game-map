import './preview.scss';

/** Class representing preview */
export default class Preview {

  /**
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('preview');
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Attach instance to preview.
   * @param {H5P.ContentType} instance Instance to attach.
   */
  attachInstance(instance) {
    if (typeof instance?.attach !== 'function') {
      return;
    }

    this.dom.innerHTML = ''; // Clear previous instance
    this.instance = instance;

    instance.attach(H5P.jQuery(this.dom));
  }

  /**
   * Resize the instance in the preview.
   */
  resize() {
    this.instance?.trigger('resize');
  }

  /**
   * Cheat!
   * @param {object} params Cheat parameters.
   */
  cheat(params) {
    if (!this.instance) {
      return;
    }

    this.instance.cheat(params);
  }
}
