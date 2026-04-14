import TabList from './tab-list.js';
import Util from '@services/util.js';
import CheatOptionsGlobal from './cheat-options-global.js';
import CheatOptionsStages from './cheat-options-stages.js';
import './cheat-options.scss';

export default class CheatOptions {
  /**
   * @class
   * @param {object} params Parameters for cheat options.
   * @param {object} params.dictionary Dictionary for localization.
   * @param {object} callbacks Callbacks for cheat options.
   * @param {function} callbacks.onCheat Callback for when the cheat button is clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onCheat: () => {},
    }, callbacks);

    this.handleCheat = this.handleCheat.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('cheat-options');

    this.details = document.createElement('details');
    this.details.classList.add('cheat-options-details');
    this.details.setAttribute('name', 'cheat-options');

    const summary = document.createElement('summary');
    summary.classList.add('cheat-options-summary');
    summary.innerText = params.dictionary.get('l10n.cheatOptions');
    this.details.append(summary);

    const contents = document.createElement('div');
    contents.classList.add('cheat-options-contents');
    this.details.append(contents);

    this.cheatOptionsGlobal = new CheatOptionsGlobal({ dictionary: this.params.dictionary });
    this.cheatOptionsStages = new CheatOptionsStages({ dictionary: this.params.dictionary });

    const tabList = new TabList(
      {
        dictionary: this.params.dictionary,
        tabs: [
          {
            label: this.params.dictionary.get('l10n.global'),
            contentClass: this.cheatOptionsGlobal,
          },
          {
            label: this.params.dictionary.get('l10n.stages'),
            contentClass: this.cheatOptionsStages,
          },
        ],
      },
    );
    contents.append(tabList.getDOM());

    const contentsFooter = document.createElement('div');
    contentsFooter.classList.add('cheat-options-contents-footer', 'h5p-editor-gamemap-dialog-buttons');
    contents.append(contentsFooter);

    this.cheatButton = document.createElement('button');
    this.cheatButton.classList.add(
      'cheat-options-cheat-button', 'h5p-editor-gamemap-dialog-button', 'h5p-editor-cheat',
    );
    this.cheatButton.innerText = params.dictionary.get('l10n.cheat');
    this.cheatButton.addEventListener('click', this.handleCheat);
    contentsFooter.append(this.cheatButton);

    this.dom.append(this.details);
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Handle cheat call.
   */
  handleCheat() {
    const values = {
      ...this.cheatOptionsGlobal.getValues(),
      ...this.cheatOptionsStages.getValues(),
    };

    this.callbacks.onCheat(values);
  }

  /**
   * Remove from DOM.
   */
  remove() {
    this.cheatButton.removeEventListener('click', this.handleCheat);
    this.dom.remove();
  }

  // Reset
  reset() {
    this.details.open = false;
  }

  /**
   * Set instance.
   * @param {object} instance H5P content type instance.
   */
  setInstance(instance) {
    this.cheatOptionsStages.setInstance(instance);
  }
}
