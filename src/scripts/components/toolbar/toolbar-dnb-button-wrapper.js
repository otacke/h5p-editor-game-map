import Util from '@services/util.js';

export default class ToolbarDnbButtonWrapper {

  constructor(params = {}, callbacks = {}) {
    params.a11y = params.a11y ?? {};

    this.callbacks = Util.extend({
      onKeydown: () => {},
    }, callbacks);

    this.id = params.id;
    this.button = params.buttonDOM;
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('aria-label', this.button.getAttribute('aria-label'));

    this.button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.stopPropagation();

      this.button.dispatchEvent(new MouseEvent('mousedown', {
        which: 1, // DragNBar uses deprecated which property to identify left mouse button
      }));

      // Focus the DNB element, otherwise keydown listener of group will still be in focus
      window.requestAnimationFrame(() => {
        const focusedElement = document.querySelector('.h5p-editor-game-map-element.h5p-dragnbar-element.focused');
        if (!focusedElement) {
          return;
        }

        focusedElement.focus();
        this.callbacks.onKeydown(focusedElement);
      });
    });
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.button;
  }

  /**
   * Focus button.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Set attribute.
   * @param {string} attribute Attribute key.
   * @param {string} value Attribute value.
   */
  setAttribute(attribute, value) {
    this.button.setAttribute(attribute, value);
  }
}
