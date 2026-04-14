import CheatOptions from './cheat-options/cheat-options.js';
import './preview-overlay.scss';
import Preview from './preview.js';

/** Class representing the preview overlay */
export default class PreviewOverlay {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params || {};
    this.callbacks = callbacks || {
      onDone: () => {},
    };

    this.dom = document.createElement('div');
    this.dom.classList.add('preview-overlay');

    this.handleOutsideClick = this.handleOutsideClick.bind(this);

    this.hide();

    const previewContent = document.createElement('div');
    previewContent.classList.add('preview-content');
    this.dom.appendChild(previewContent);

    const previewLabel = document.createElement('div');
    previewLabel.classList.add('preview-label');
    previewLabel.innerHTML = this.params.dictionary.get('l10n.preview');
    previewContent.appendChild(previewLabel);

    const previewExplanation = document.createElement('div');
    previewExplanation.classList.add('preview-explanation');
    previewExplanation.innerHTML = this.params.dictionary.get('l10n.previewExplanation');
    previewContent.appendChild(previewExplanation);

    this.cheatOptions = new CheatOptions(
      {
        dictionary: this.params.dictionary,
      },
      {
        onCheat: (params) => {
          this.preview.cheat(params);
        },
      },
    );
    previewContent.appendChild(this.cheatOptions.getDOM());

    this.previewWrapper = document.createElement('div');
    this.previewWrapper.classList.add('preview-wrapper');
    previewContent.appendChild(this.previewWrapper);

    this.preview = new Preview();
    this.previewWrapper.appendChild(this.preview.getDOM());

    const buttons = document.createElement('div');
    buttons.classList.add('h5p-editor-gamemap-dialog-buttons');

    const buttonDone = document.createElement('button');
    buttonDone.classList.add('h5p-editor-gamemap-dialog-button');
    buttonDone.classList.add('h5p-editor-done');
    buttonDone.innerText = this.params.dictionary.get('l10n.done');
    buttonDone.addEventListener('click', () => {
      this.callbacks.onDone();
    });
    buttons.append(buttonDone);
    previewContent.append(buttons);
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

    this.setTop(''); // Remove potentially previously set top value
    this.preview.attachInstance(instance);
    this.cheatOptions.setInstance(instance);
  }

  /**
   * Set DOM top value.
   * @param {string} value Top value.
   */
  setTop(value) {
    if (typeof value !== 'string') {
      return;
    }

    this.dom.style.top = value;
  }

  /**
   * Show preview overlay.
   */
  show() {
    this.dom.classList.remove('display-none');
    this.params.globals.get('resize')();
    this.isVisible = true;
    document.addEventListener('pointerdown', this.handleOutsideClick);
  }

  /**
   * Hide preview overlay.
   */
  hide() {
    this.cheatOptions?.reset();
    this.dom.classList.add('display-none');
    this.params.globals.get('resize')();
    this.isVisible = false;
    document.removeEventListener('pointerdown', this.handleOutsideClick);
  }

  /**
   * Cloak preview.
   */
  cloak() {
    this.dom.classList.add('display-invisible');
  }

  /**
   * Decloak preview.
   */
  decloak() {
    this.dom.classList.remove('display-invisible');
  }

  /**
   * Resize preview.
   */
  resize() {
    if (!this.isVisible) {
      return;
    }

    this.preview.resize();
  }

  /**
   * Handle outside click.
   * @param {PointerEvent} event Pointer event.
   */
  handleOutsideClick(event) {
    if (!this.dom.contains(event.target)) {
      this.callbacks.onDone();
    }
  }
}
