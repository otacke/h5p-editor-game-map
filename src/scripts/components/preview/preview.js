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

    this.detach();
    this.instance = instance;

    instance.attach(H5P.jQuery(this.dom));
  }

  /**
   * Detach current instance and let H5P / jQuery teardown run.
   */
  detach() {
    if (!this.instance) {
      return;
    }

    // jQuery .empty() fires the 'remove' event that H5P / sub-content
    // teardown handlers listen for, unlike innerHTML = ''.
    H5P.jQuery(this.dom).empty();
    this.instance = null;
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
