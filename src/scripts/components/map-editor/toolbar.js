import Util from '@services/util';
import './toolbar.scss';

export default class Toolbar {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: []
    }, params);
    this.callbacks = Util.extend({
      onStoppedMoving: () => {},
      onReleased: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-editor-dnb');

    this.toolbar = new H5P.DragNBar(
      this.params.buttons,
      H5P.jQuery(this.params.mapContainer),
      H5P.jQuery(this.params.dialogContainer),
      { enableCopyPaste: false }
    );

    // Must set containerEm
    this.toolbar.dnr.setContainerEm(parseFloat(H5P.jQuery(this.params.mapContainer).css('font-size')));

    this.toolbar.stopMovingCallback = (x, y) => {
      this.callbacks.onStoppedMoving(
        // Seems there's no better way to get hold of element added
        this.toolbar.dnd.$element.data('id'), x, y
      );
    };

    this.toolbar.dnd.releaseCallback = () => {
      if (this.toolbar.newElement) {
        setTimeout(() => {
          // Seems there's no better way to get hold of element added
          this.callbacks.onReleased(this.toolbar.dnd.$element.data('id'));
        }, 1);
      }
    };

    this.toolbar.dnd.moveCallback = (x, y, $element) => {
      this.callbacks.onMoved(
        $element.data('id'),
        Math.round(parseFloat($element.css('left'))),
        Math.round(parseFloat($element.css('top')))
      );
    };

    this.toolbar.attach(H5P.jQuery(this.dom));
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
   * Relay `add` to DnB toolbar.
   *
   * @param {H5P.jQuery} $element Element.
   * @param {string} [clipboardData] Clipboard data.
   * @param {object} [options] Options.
   * @param {H5P.DragNBarElement} [options.dnbElement] Register new element with dnbelement.
   * @param {boolean} [options.disableResize] If true, disable resize.
   * @param {boolean} [options.lock] If true, lock ratio during resize.
   * @returns {H5P.DragNBarElement} Reference to added dnbelement.
   */
  add($element, clipboardData, options) {
    return this.toolbar.add($element, clipboardData, options);
  }

  /**
   * Relay `blurAll` to DnB toolbar.
   */
  blurAll() {
    this.toolbar.blurAll();
  }
}
