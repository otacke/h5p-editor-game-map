import Util from '@services/util.js';
import ToolbarButton from './toolbar-button.js';
import './toolbar-group.scss';
import ToolbarDnbButtonWrapper from './toolbar-dnb-button-wrapper.js';

export default class ToolbarGroup {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      buttons: [],
      a11y: {},
    }, params);

    this.callbacks = Util.extend({
      onKeydown: () => {},
    }, callbacks);

    this.buttons = {};

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-toolbar-group');
    if (this.params.position) {
      this.dom.classList.add(`position-${this.params.position}`);
    }

    this.dom.setAttribute('role', 'toolbar');
    if (params.className) {
      this.dom.classList.add(params.className);
    }
    if (params.a11y.toolbarLabel) {
      this.dom.setAttribute('aria-label', params.a11y.toolbarLabel);
    }
    if (params.ariaControlsId) {
      this.dom.setAttribute('aria-controls', params.ariaControlsId);
    }

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    if (this.params.buttons.length) {
      this.params.buttons.forEach((button) => {
        this.addButton(button);
      });
    }
    else if (this.params.dnbDOM) {
      this.addDNBButtons(this.params.dnbDOM);
    }

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
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

  /**
   * Focus whatever should get focus.
   */
  focus() {
    Object.values(this.buttons)[this.currentButtonIndex]?.focus();
  }

  /**
   * Add button.
   * @param {object} [button] Button parameters.
   */
  addButton(button = {}) {
    if (typeof button.id !== 'string') {
      return; // We need an id at least
    }

    this.buttons[button.id] = new ToolbarButton(
      {
        id: button.id,
        ...(button.a11y && { a11y: button.a11y }),
        classes: ['toolbar-button', `toolbar-button-${button.id}`],
        ...(typeof button.disabled === 'boolean' && {
          disabled: button.disabled,
        }),
        ...(button.keyshortcuts && { keyshortcuts: button.keyshortcuts }),
        ...(button.tooltip && { tooltip: button.tooltip }),
        ...(button.active && { active: button.active }),
        ...(button.type && { type: button.type }),
        ...(button.pulseStates && { pulseStates: button.pulseStates }),
        ...(button.pulseIndex && { pulseIndex: button.pulseIndex }),
      },
      {
        ...(typeof button.onClick === 'function' && {
          onClick: (event, params) => {
            button.onClick(event, params);
          },
        }),
      },
    );

    this.dom.append(this.buttons[button.id].getDOM());
  }

  /**
   * Add DnB buttons from DNB DOM.
   * @param {HTMLElement} dnbDOM DNB DOM.
   */
  addDNBButtons(dnbDOM) {
    const fakeButtons = dnbDOM.querySelectorAll('.h5p-dragnbar-li');
    fakeButtons.forEach((fakeButton, index) => {
      const anchor = fakeButton.querySelector('a');
      const buttonId = (anchor.getAttribute('aria-label') ?? `button-${index}`).toLowerCase();

      this.buttons[buttonId] = new ToolbarDnbButtonWrapper({
        id: buttonId,
        buttonDOM: anchor,
      }, {
        onKeydown: (focusedElement) => {
          this.callbacks.onKeydown(focusedElement);
        },
      });
    });

    this.dom.append(dnbDOM);
  }

  /**
   * Enable.
   */
  enable() {
    for (const id in this.buttons) {
      this.enableButton(id);
    }
  }

  /**
   * Disable.
   */
  disable() {
    for (const id in this.buttons) {
      this.disableButton(id);
    }
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focusButton(id = '') {
    if (!this.buttons[id] || this.buttons[id].isCloaked()) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }

    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }

    Object.values(this.buttons)[this.currentButtonIndex]
      .setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex,
      );
    }
    else {
      return;
    }

    event.preventDefault();
  }
}
