import Util from '@services/util.js';
import './dialog.scss';

export default class Dialog {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onChange: () => {},
      onDone: () => {},
      onRemoved: () => {},
    }, callbacks);

    this.callbacks.onChange = this.callbacks.onChange.bind(this);
    this.toggleScoreScalingVisibility = this.toggleScoreScalingVisibility.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-game-map-fluid-dialog');

    this.dialogInner = document.createElement('div');
    this.dialogInner.classList.add('h5p-editor-game-map-fluid-dialog-inner');

    const buttons = document.createElement('div');
    buttons.classList.add('h5p-editor-game-map-fluid-dialog-buttons');

    const buttonDone = document.createElement('button');
    buttonDone.classList.add('h5p-editor-game-map-fluid-dialog-button');
    buttonDone.classList.add('h5p-editor-done');
    buttonDone.innerText = this.params.dictionary.get('l10n.done');
    buttonDone.addEventListener('click', () => {
      this.handleDone();
    });
    buttons.appendChild(buttonDone);

    const buttonRemove = document.createElement('button');
    buttonRemove.classList.add('h5p-editor-game-map-fluid-dialog-button');
    buttonRemove.classList.add('h5p-editor-remove');
    buttonRemove.innerText = this.params.dictionary.get('l10n.remove');
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
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Detect if dialog is shown.
   * @returns {boolean} True if shown, false otherwise.
   */
  isShown() {
    return !this.dom.classList.contains('display-none');
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
   * @param {object} [params] Parameters.
   * @param {HTMLElement} params.form Form.
   */
  showForm(params = {}) {
    this.callbacks.onChange = params.changeCallback ?? (() => {});
    this.callbacks.onDone = params.doneCallback ?? (() => {});
    this.callbacks.onRemoved = params.removeCallback ?? (() => {});

    this.formDOM = params.form;
    this.dialogInner.appendChild(this.formDOM);

    if (params.changeCallback) {
      this.formDOM.addEventListener('focusout', this.callbacks.onChange); // Form fields
      this.formDOM.addEventListener('mouseup', this.callbacks.onChange); // VerticalTabs
    }

    this.toggleLivesDetailsVisibility(this.showLivesDetailsState);

    this.randomExerciseToggleDOM =
      this.formDOM.querySelector('.field-name-randomExercises [id^="field-randomexercises-"]');

    this.randomExerciseToggleDOM?.addEventListener('change', this.toggleScoreScalingVisibility);
    this.toggleScoreScalingVisibility();

    this.show();
  }

  /**
   * Hide dialog form.
   */
  hideForm() {
    this.formDOM.removeEventListener('focusout', this.callbacks.onChange);
    this.formDOM.removeEventListener('mouseup', this.callbacks.onChange);
    this.randomExerciseToggleDOM?.removeEventListener('change', this.toggleScoreScalingVisibility);

    this.dialogInner.innerHTML = '';
    this.hide();
  }

  /**
   * Handle "done" option in dialog.
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

  /**
   * Toggle visibility of lives details fields in dialog. May still be overruled by is-task flag on .content.
   * @param {boolean} visible True to show, false to hide.
   */
  toggleLivesDetailsVisibility(visible) {
    this.showLivesDetailsState = visible;

    this.dialogInner.querySelectorAll('.field.field-name-livesSettings')?.forEach((field) => {
      field.classList.toggle('display-none', !visible);
    });
  }

  /**
   * Toggle visibility of score scaling.
   * @param {boolean} [requestVisible] True to show, false to hide.
   */
  toggleScoreScalingVisibility(requestVisible) {
    const visible = (typeof requestVisible === 'boolean') ?
      requestVisible :
      (!this.randomExerciseToggleDOM.checked ?? true);

    const scoreScalingDOM = this.formDOM.querySelector('.h5peditor-game-map-score-scaling');
    scoreScalingDOM?.classList.toggle('display-none', !visible);
  }
}
