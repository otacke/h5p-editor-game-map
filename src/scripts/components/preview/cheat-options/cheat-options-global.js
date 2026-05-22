import './cheat-options-global.scss';

export default class CheatOptionsGlobal {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} params.dictionary Dictionary.
   */
  constructor(params = {}) {
    const tmp = this.buildDOM(params);
    this.dom = tmp.dom;
    this.livesInput = tmp.livesInput;
    this.timeInput = tmp.timeInput;
  }

  /**
   * Build DOM.
   * @param {object} params Parameters.
   * @returns {object} DOM elements.
   */
  buildDOM(params = {}) {
    const dom = document.createElement('div');
    dom.classList.add('cheat-options-wrapper', 'global');

    let tmp = this.buildNumberField({
      label: params.dictionary.get('l10n.lives'),
      explanation: params.dictionary.get('l10n.livesExplanation'),
      min: 0,
      step: 1,
    });
    dom.append(tmp.label);
    dom.append(tmp.option);
    const livesInput = tmp.field;

    tmp = this.buildNumberField({
      label: params.dictionary.get('l10n.time'),
      explanation: params.dictionary.get('l10n.timeExplanation'),
      min: 0,
      step: 1,
    });
    dom.append(tmp.label);
    dom.append(tmp.option);
    const timeInput = tmp.field;

    return  { dom, livesInput, timeInput };
  }

  /**
   * Build number field for cheat options.
   * @param {object} params Parameters.
   * @param {string} params.label Label.
   * @param {string} [params.explanation] Explanation text.
   * @param {number} [params.min] Minumum value.
   * @param {number} [params.step] Step.
   * @param {number} [params.max] Maximum value.
   * @returns {object} Field doms.
   */
  buildNumberField(params = {}) {
    const uuid = H5P.createUUID();

    const label = document.createElement('label');
    label.classList.add('cheat-options-label');
    label.setAttribute('for', uuid);
    label.innerText = params.label;

    const option = document.createElement('div');
    option.classList.add('cheat-options-input-wrapper');

    const field = document.createElement('input');
    field.setAttribute('type', 'number');
    field.setAttribute('id', uuid);
    field.classList.add('cheat-options-input');
    if (typeof params.min === 'number') {
      field.min = params.min;
    }
    if (typeof params.step === 'number') {
      field.step = params.step;
    }
    if (typeof params.max === 'number') {
      field.max = params.max;
    }
    option.append(field);

    if (params.explanation) {
      const explanation = document.createElement('div');
      explanation.classList.add('cheat-options-explanation');
      explanation.innerText = params.explanation;
      option.append(explanation);
    }

    return { label, option, field };
  }

  /**
   * Get DOM for global options.
   * @returns {HTMLElement} DOM for global options.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get values from fields.
   * @returns {object} Values from fields.
   */
  getValues() {
    const values = {};

    const livesLeft = this.livesInput?.value ? parseInt(this.livesInput.value, 10) : undefined;
    if (livesLeft !== undefined && !Number.isNaN(livesLeft)) {
      values.livesLeft = livesLeft;
    }

    const timeLeftS = this.timeInput?.value ? parseInt(this.timeInput.value, 10) : undefined;
    if (timeLeftS !== undefined && !Number.isNaN(timeLeftS)) {
      values.timeLeftS = timeLeftS;
    }

    return values;
  }
}
