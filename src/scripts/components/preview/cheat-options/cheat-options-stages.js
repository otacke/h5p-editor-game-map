import './cheat-options-stages.scss';

/** @constant {object} STATES States lookup. */
export const STATES = {
  locked: 1,
  open: 3,
  opened: 4, // Rename to tried or similar
  completed: 5,
  cleared: 6, // Exercise, Stage, Path,
  sealed: 7, // Stage
};

/** @constant {object} STAGE_TYPES types lookup. */
export const STAGE_TYPES = {
  'stage': 0,
  'special-stage': 1,
};

export default class CheatOptionsStages {
  /**
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('cheat-options-wrapper', 'stages');
    // Must be filled by setInstance()

    this.stageFields = {};
  }

  /**
   * Get stages options DOM.
   * @returns {HTMLElement} DOM for stages options.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get values from fields.
   * @returns {object} Values from fields.
   */
  getValues() {
    const stages = Object.keys(this.stageFields)
      .map((key) => {
        const values = { id: key };

        if (this.stageFields[key].stateSelect) {
          const state = parseInt(this.stageFields[key].stateSelect.value, 10) ?? undefined;
          if (typeof state === 'number' && !Number.isNaN(state)) {
            values.state = state;
          }
        };

        if (this.stageFields[key].scoreInput) {
          const score = parseInt(this.stageFields[key].scoreInput.value, 10) ?? undefined;
          if (typeof score === 'number' && !Number.isNaN(score)) {
            values.score = score;
          }
        };

        if (this.stageFields[key].timeInput) {
          const timeLeftS = parseInt(this.stageFields[key].timeInput.value, 10) ?? undefined;
          if (typeof timeLeftS === 'number' && !Number.isNaN(timeLeftS)) {
            values.timeLeftS = timeLeftS;
          }
        };

        return values;
      })
      .filter((values) => Object.keys(values).length > 1);

    return stages.length ? { stages: stages } : {};
  }

  /**
   * Set instance.
   * @param {object} instance H5P content type instance.
   */
  setInstance(instance) {
    this.stageFields = {};
    this.dom.innerHTML = '';

    const stages = instance.getStages(); // Stages class, not an array
    stages.forEach((stage) => {
      const id = stage.getId();

      this.stageFields[id] = {};

      const stageDetail = this.buildDetail({
        label: stage.getLabel(),
        type: stage.getType(),
        id: id,
        dictionary: this.params.dictionary,
      });
      this.dom.append(stageDetail);
    });
  }

  /**
   * Build detail (accordion).
   * @param {object} params Parameters.
   * @returns {HTMLElement} Details (accordion).
   */
  buildDetail(params = {}) {
    const detail = document.createElement('details');
    detail.classList.add('cheat-options-stage-detail');
    detail.setAttribute('name', 'stage-detail');

    const summary = document.createElement('summary');
    summary.classList.add('cheat-options-stage-summary');
    summary.innerText = params.label;
    detail.append(summary);

    const contents = document.createElement('div');
    contents.classList.add('cheat-options-stage-contents');
    detail.append(contents);

    let tmp = this.buildStateSelect({ id: params.id, dictionary: params.dictionary });
    contents.append(tmp.label);
    contents.append(tmp.option);
    this.stageFields[params.id].stateSelect = tmp.field;

    if ((params.type) === STAGE_TYPES.stage) {
      tmp = this.buildScoreInput({ id: params.id, dictionary: params.dictionary });
      contents.append(tmp.label);
      contents.append(tmp.option);
      this.stageFields[params.id].scoreInput = tmp.field;

      tmp = this.buildTimeInput({ id: params.id, dictionary: params.dictionary });
      contents.append(tmp.label);
      contents.append(tmp.option);
      this.stageFields[params.id].timeInput = tmp.field;
    }

    return detail;
  }

  /**
   * Build state select fields.
   * @param {object} params Parameters,
   * @returns {object} DOM elements.
   */
  buildStateSelect(params = {}) {
    const stateSelectUUID = `stage-${params.id}-state`;

    const label = document.createElement('label');
    label.classList.add('cheat-options-label');
    label.innerText = params.dictionary.get('l10n.state');
    label.setAttribute('for', stateSelectUUID);

    const option = document.createElement('div');
    option.classList.add('cheat-options-input-wrapper');

    const field = document.createElement('select');
    field.setAttribute('id', stateSelectUUID);
    field.classList.add('cheat-options-select');
    option.append(field);

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.innerText = params.dictionary.get('l10n.stateDefault');
    field.append(defaultOption);

    Object.keys(STATES).forEach((state) => {
      const selectOption = document.createElement('option');
      selectOption.value = STATES[state];
      selectOption.innerText = params.dictionary.get(`l10n.state${state.charAt(0).toUpperCase() + state.slice(1)}`);
      field.append(selectOption);
    });

    const explanation = document.createElement('div');
    explanation.classList.add('cheat-options-explanation');
    explanation.innerText = params.dictionary.get('l10n.stateExplanation');
    option.append(explanation);

    return { label, option, field };
  }

  /**
   * Build score input field.
   * @param {object} params Parameters.
   * @returns {object} DOM elements.
   */
  buildScoreInput(params = {}) {
    const scoreInputUUID = `stage-${params.id}-score`;

    const label = document.createElement('label');
    label.classList.add('cheat-options-label');
    label.innerText = params.dictionary.get('l10n.score');
    label.setAttribute('for', scoreInputUUID);

    const option = document.createElement('div');
    option.classList.add('cheat-options-input-wrapper');

    const field = document.createElement('input');
    field.setAttribute('type', 'number');
    field.setAttribute('id', scoreInputUUID);
    field.classList.add('cheat-options-input');
    field.min = 0;
    field.step = 1;
    option.append(field);

    const explanation = document.createElement('div');
    explanation.classList.add('cheat-options-explanation');
    explanation.innerText = params.dictionary.get('l10n.scoreExplanation');
    option.append(explanation);

    return { label, option, field };
  }

  /**
   * Build time input field.
   * @param {object} params Parameters.
   * @returns {object} DOM elements.
   */
  buildTimeInput(params = {}) {
    const timeInputUUID = `stage-${params.id}-time`;

    const label = document.createElement('label');
    label.classList.add('cheat-options-label');
    label.innerText = params.dictionary.get('l10n.time');
    label.setAttribute('for', timeInputUUID);

    const option = document.createElement('div');
    option.classList.add('cheat-options-input-wrapper');

    const field = document.createElement('input');
    field.setAttribute('type', 'number');
    field.setAttribute('id', timeInputUUID);
    field.classList.add('cheat-options-input');
    field.min = 0;
    field.step = 1;
    option.append(field);

    const explanation = document.createElement('div');
    explanation.classList.add('cheat-options-explanation');
    explanation.innerText = params.dictionary.get('l10n.stageTimeExplanation');
    option.append(explanation);

    return { label, option, field };
  }
}
