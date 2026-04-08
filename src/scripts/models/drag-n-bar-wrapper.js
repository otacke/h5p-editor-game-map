import Util from '@services/util.js';

export default class DragNBarWrapper {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      subContentOptions: [],
      buttons: [],
    }, params);

    this.callbacks = Util.extend({
      onStoppedMoving: () => {},
      onReleased: () => {},
      onMoved: () => {},
      onResized: () => {},
      createElement: () => {},
    }, callbacks);

    this.dnb = new H5P.DragNBar(
      this.params.buttons,
      H5P.jQuery(this.params.elementArea),
      H5P.jQuery(this.params.dialogContainer),
      { enableCopyPaste: false },
    );

    this.dnb.stopMovingCallback = (x, y) => {
      this.callbacks.onStoppedMoving(
        // Seems there's no better way to get hold of element added
        this.dnb.dnd.$element.data('id'), x, y,
      );
    };

    this.dnb.dnd.releaseCallback = () => {
      if (this.dnb.newElement) {
        setTimeout(() => {
          // Seems there's no better way to get hold of element added
          this.callbacks.onReleased(this.dnb.dnd.$element.data('id'));
        }, 1);
      }
    };

    this.dnb.dnd.moveCallback = (x, y, $element) => {
      this.callbacks.onMoved(
        $element.data('id'),
        Math.round(parseFloat($element.css('left'))),
        Math.round(parseFloat($element.css('top'))),
      );
    };

    this.dnb.dnr.on('stoppedResizing', (event) => {
      const $element = this.dnb.$element;

      this.callbacks.onResized(
        $element.data('id'),
        parseFloat($element.css('left')),
        parseFloat($element.css('top')),
        parseFloat($element.css('width')),
        parseFloat($element.css('height')),
      );
    });
  }

  /**
   * Attach DnB toolbar to DOM.
   * @param {HTMLElement} dom DOM element to attach to.
   */
  attach(dom) {
    this.parentDOM = dom;

    this.dnb.attach(H5P.jQuery(dom));
  }

  /**
   * Get parent DOM.
   * @returns {HTMLElement} Parent DOM.
   */
  getParentDOM() {
    return this.parentDOM;
  }

  /**
   * Relay `add` to DnB toolbar.
   * @param {H5P.jQuery} $element Element.
   * @param {string} [clipboardData] Clipboard data.
   * @param {object} [options] Options.
   * @param {H5P.DragNBarElement} [options.dnbElement] Register new element with dnbelement.
   * @param {boolean} [options.disableResize] If true, disable resize.
   * @param {boolean} [options.lock] If true, lock ratio during resize.
   * @returns {H5P.DragNBarElement} Reference to added dnbelement.
   */
  add($element, clipboardData, options) {
    const element = this.dnb.add($element, clipboardData, options);

    // Remove z-axis buttons. Unfortunately, no function for this.
    element.contextMenu.$buttons.get(0).querySelector('.bringtofront').remove();
    element.contextMenu.$buttons.get(0).querySelector('.sendtoback').remove();

    return element;
  }

  /**
   * Remove element from DnB toolbar that needs to be replaced.
   * @param {object} dnbElement DnB element.
   */
  remove(dnbElement) {
    this.dnb.elements.splice(this.dnb.elements.indexOf(dnbElement), 1);
  }

  /**
   * Focus element in DnB toolbar.
   * @param {Element} element Element.
   */
  focus(element) {
    this.dnb.focus(element.getData().$element);
  }

  /**
   * Relay `blurAll` to DnB toolbar.
   */
  blurAll() {
    this.dnb.blurAll();
  }

  /**
   * Set container font size in em. Required for DnR for resizing.
   * @param {number} fontSize Font size.
   */
  setContainerEm(fontSize) {
    // Must set containerEm for resizing
    this.dnb.dnr.setContainerEm(fontSize);
  }

  /**
   * Update coordinates of DnB toolbar.
   */
  updateCoordinates() {
    this.dnb.updateCoordinates();
  }
}
