import Dictionary from '@services/dictionary';
import Util from '@services/util';
import './dialog.scss';

export default class Dialog {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);
    this.callbacks = Util.extend({
      onDone: () => {},
      onRemoved: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-fluid-dialog');

    this.dialogInner = document.createElement('div');
    this.dialogInner.classList.add('h5p-editor-game-map-fluid-dialog-inner');

    const buttons = document.createElement('div');
    buttons.classList.add('h5p-editor-game-map-fluid-dialog-buttons');

    const buttonDone = document.createElement('button');
    buttonDone.classList.add('h5p-editor-game-map-fluid-dialog-button');
    buttonDone.classList.add('h5p-editor-done');
    buttonDone.innerText = Dictionary.get('l10n.done');
    buttonDone.addEventListener('click', () => {
      this.handleDone();
    });
    buttons.appendChild(buttonDone);

    const buttonRemove = document.createElement('button');
    buttonRemove.classList.add('h5p-editor-game-map-fluid-dialog-button');
    buttonRemove.classList.add('h5p-editor-remove');
    buttonRemove.innerText = Dictionary.get('l10n.remove');
    buttonRemove.addEventListener('click', () => {
      this.handleRemove();
    });
    buttons.appendChild(buttonRemove);

    this.dom.appendChild(this.dialogInner);
    this.dom.appendChild(buttons);

    this.hide();
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
   * Show dialog form.
   *
   * @param {object} [params={}] Parameters.
   * @param {HTMLElement} params.form Form.
   */
  showForm(params = {}) {
    this.callbacks.onDone = params.doneCallback ?? (() => {});
    this.callbacks.onRemoved = params.removeCallback ?? (() => {});

    this.dialogInner.appendChild(params.form);
    this.show();
  }

  /**
   * Hide dialog form.
   */
  hideForm() {
    this.dialogInner.innerHTML = '';
    this.hide();
  }

  /**
   * Handle "done" option in dialog.
   *
   * @returns {boolean} False.
   */
  handleDone() {
    if (this.callbacks.onDone()) {
      this.hideForm();
    }

    return false;
  }

  /**
   * Handle "remove" option in dialog.
   */
  handleRemove() {
    this.callbacks.onRemoved();
    this.hideForm();
  }
}
