import './row.scss';

/** @constant {string} NO_VALUE_STRING String to display when there is no valid value. */
const NO_VALUE_STRING = '---';

export default class Row {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChange Callback to call when values change.
   */
  constructor(params = {}, callbacks = {}) {
    this.index = params.index;
    this.isTaskState = !!params.isTask;
    this.weightIsPercentage = params.weightIsPercentage;
    this.scalingMode = params.scalingMode;
    this.visualPrecision = params.visualPrecision;

    this.setWeightedMaxScore(params.weightedMaxScore ?? 0);
    this.setWeight(params.weight);

    this.callbacks = callbacks;
    this.callbacks.onChange = callbacks.onChange || (() => {});

    const doms = this.buildDOMs(params);
    this.nameDOM = doms.nameDOM;
    this.maxScoreDOM = doms.maxScoreDOM;
    this.weightDOM = doms.weightDOM;
    this.weightedMaxScoreDOM = doms.weightedMaxScoreDOM;

    this.setMaxScore(params.maxScore);

    this.handleChanged = this.handleChanged.bind(this);
    this.handleInput = this.handleInput.bind(this);

    this.update();
  }

  /**
   * Set the weighted max score for the exercise.
   * @param {string|number} weightedMaxScore The weighted max score to set.
   */
  setWeightedMaxScore(weightedMaxScore) {
    const parsedWeightedMaxScore = parseFloat(weightedMaxScore);
    const weightedMaxScoreIsValidNumber = this.isTask() &&
      !Number.isNaN(parsedWeightedMaxScore) && parsedWeightedMaxScore >= 0;

    this.weightedMaxScore = weightedMaxScoreIsValidNumber ? parsedWeightedMaxScore : 0;
    if (this.scalingMode === 'weightedExercises' && this.weightIsPercentage) {
      this.weightedMaxScore = this.weightedMaxScore / 100;
    }

    if (!this.weightedMaxScoreDOM) {
      return;
    }

    if (!weightedMaxScoreIsValidNumber) {
      this.weightedMaxScoreDOM.innerText = NO_VALUE_STRING;
      return;
    }

    if (this.scalingMode === 'totalScore' || this.scalingMode === 'weightedExercises') {
      this.weightedMaxScoreDOM.innerText = this.weightedMaxScore.toFixed(this.getVisualPrecision());
    }
    else if (this.scalingMode === 'maxScore') {
      if (this.weightedMaxScoreDOM.value !== this.weightedMaxScore.toString()) {
        this.weightedMaxScoreDOM.value = this.weightedMaxScore.toFixed(0);
      }
    }
  }

  /**
   * Get the visual precision for displaying scores.
   * @returns {number} The visual precision.
   */
  getVisualPrecision() {
    return this.visualPrecision ?? 0;
  }

  /**
   * Set weight for exercise.
   * @param {string|number} weight Weight to set.
   */
  setWeight(weight) {
    const parsedWeight = parseFloat(weight);
    let weightIsValidNumber = this.isTask() &&
      !Number.isNaN(parsedWeight) && parsedWeight >= 0;

    if (weightIsValidNumber && this.weightIsPercentage) {
      weightIsValidNumber = parsedWeight <= 100;
    }

    this.weight = weightIsValidNumber ? parsedWeight : 1;

    if (!this.weightDOM) {
      return;
    }

    if (!weightIsValidNumber) {
      this.weightDOM.innerText = NO_VALUE_STRING;
      return;
    }

    if (this.scalingMode === 'maxScore') {
      this.weight = Math.round(this.getWeightedMaxScore()) / this.getMaxScore();
      this.weightDOM.innerText = this.weight.toFixed(this.getVisualPrecision());
    }
    else if (this.scalingMode === 'weightedExercises') {
      this.weight = Math.round(this.weight);

      if (this.weightDOM.value !== this.weight.toString()) {
        this.weightDOM.value = this.weight.toFixed(0);
      }
    }
    else if (this.scalingMode === 'totalScore') {
      this.weightDOM.innerText = this.weight.toFixed(this.getVisualPrecision());
    }

    this.setWeightedMaxScore(weight * this.getMaxScore());
  }

  /**
   * Get weighted max score for exercise.
   * @returns {number} Weighted max score.
   */
  getWeightedMaxScore() {
    return this.weightedMaxScore ?? 0;
  }

  /**
   * Get max score for exercise.
   * @returns {number} Max score.
   */
  getMaxScore() {
    return this.maxScore ?? 1;
  }

  /**
   * Build DOM elements for row.
   * @param {object} params Parameters.
   * @param {string} params.name Name of exercise.
   * @param {boolean} params.weightIsPercentage Whether weight is percentage or not.
   * @param {string|number} params.weight Initial weight value.
   * @param {string|number} params.weightedMaxScore Initial weighted max score value.
   * @param {string|number} params.maxScore Initial max score value.
   * @returns {object} DOM elements.
   */
  buildDOMs(params = {}) {
    const nameDOM = document.createElement('div');
    nameDOM.classList.add('h5peditor-game-map-score-scaling-table-exercise-name', 'value-row');
    nameDOM.innerText = params.name || '';

    const maxScoreDOM = document.createElement('div');
    maxScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-max-score', 'value-row');

    let weightDOM;
    if (this.scalingMode === 'weightedExercises' && this.isTask()) {
      weightDOM = document.createElement('input');
      weightDOM.type = 'number';
      weightDOM.step = 1;
      weightDOM.inputMode = 'numeric';
      weightDOM.min = 0;
      weightDOM.addEventListener('input', () => {
        this.handleInput();
      });
      weightDOM.addEventListener('change', () => {
        this.handleChanged();
      });

      if (params.weightIsPercentage) {
        weightDOM.max = 100;
      }
    }
    else {
      weightDOM = document.createElement('div');
    }
    weightDOM.classList.add('h5peditor-game-map-score-scaling-table-weight', 'value-row');

    let weightedMaxScoreDOM;
    if (this.scalingMode === 'maxScore' && this.isTask()) {
      weightedMaxScoreDOM = document.createElement('input');
      weightedMaxScoreDOM.type = 'number';
      weightedMaxScoreDOM.step = 1;
      weightedMaxScoreDOM.inputMode = 'numeric';
      weightedMaxScoreDOM.min = 0;
      weightedMaxScoreDOM.addEventListener('input', () => {
        this.handleInput();
      });
      weightedMaxScoreDOM.addEventListener('change', () => {
        this.handleChanged();
      });
    }
    else {
      weightedMaxScoreDOM = document.createElement('div');
    }
    weightedMaxScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-weighted-max-score', 'value-row');

    return { nameDOM, maxScoreDOM, weightDOM, weightedMaxScoreDOM };
  }

  /**
   * Determine if row represents a task or not.
   * @returns {boolean} True if row represents a task, false otherwise.
   */
  isTask() {
    return this.isTaskState;
  }

  /**
   * Handle input to one of the input fields, ensuring only valid characters are entered.
   */
  handleInput() {
    if (this.scalingMode === 'weightedExercises') {
      if (!this.weightDOM) {
        return;
      }

      const valueForcedInteger = this.weightDOM.value.replace(/[^0-9]/g, '');
      if (valueForcedInteger !==  this.weightDOM.value) {
        this.weightDOM.value = valueForcedInteger;
      }
    }
    else if (this.scalingMode === 'maxScore') {
      if (!this.weightedMaxScoreDOM) {
        return;
      }

      const valueForcedInteger = this.weightedMaxScoreDOM.value.replace(/[^0-9]/g, '');
      if (valueForcedInteger !==  this.weightedMaxScoreDOM.value) {
        this.weightedMaxScoreDOM.value = valueForcedInteger;
      }
    }
  }

  /**
   * Handle change to one of the input fields, updating values and calling onChange callback.
   */
  handleChanged() {
    if (this.scalingMode === 'weightedExercises') {
      let weight = parseFloat(this.weightDOM.value);
      if (this.weightIsPercentage && !Number.isNaN(weight) && weight > 100) {
        weight = 100;
      }

      this.setWeight(weight);
    }
    else if (this.scalingMode === 'maxScore') {
      this.setWeightedMaxScore(parseFloat(this.weightedMaxScoreDOM.value));
      const maxScore = this.getMaxScore();
      const weight = (maxScore > 0) ? (this.getWeightedMaxScore() / maxScore) : 0;

      this.setWeight(weight);
    }

    this.callbacks.onChange?.({
      index: this.index,
      weight: this.weight,
    });
  }

  /**
   * Set max score for exercise.
   * @param {number|string} maxScore Max score to set.
   */
  setMaxScore(maxScore) {
    const parsedMaxScore = parseFloat(maxScore);
    const maxScoreIsValidNumber = this.isTask() && !Number.isNaN(parsedMaxScore) && parsedMaxScore >= 0;

    this.maxScore = maxScoreIsValidNumber ? parsedMaxScore : 0;

    if (!this.maxScoreDOM) {
      return;
    }

    if (maxScoreIsValidNumber) {
      this.maxScoreDOM.innerText = this.maxScore.toString();
      this.update();
    }
    else {
      this.maxScoreDOM.innerText = NO_VALUE_STRING;
    }
  }

  /**
   * Update row values based on current properties and scaling mode.
   */
  update() {
    if (!this.isTask()) {
      this.setWeight(NO_VALUE_STRING);
      this.setWeightedMaxScore(NO_VALUE_STRING);
      return;
    }

    if (this.scalingMode === 'weightedExercises') {
      this.setWeight(this.getWeight());
    }
    else if (this.scalingMode === 'maxScore') {
      this.setWeight(this.getWeight());
    }
    else if (this.scalingMode === 'totalScore') {
      this.setWeight(this.getWeight());
    }

    let weightedMaxScore = this.getWeightedMaxScore();
    if (this.scalingMode === 'weightedExercises' && this.weightIsPercentage) {
      weightedMaxScore = weightedMaxScore / 100;
    }
  }

  /**
   * Get weight for exercise.
   * @returns {number} Weight for exercise.
   */
  getWeight() {
    return this.weight ?? 1;
  }

  /**
   * Get DOM elements for row.
   * @returns {HTMLElement[]} DOM elements.
   */
  getDOMs() {
    return [this.nameDOM, this.weightDOM, this.maxScoreDOM, this.weightedMaxScoreDOM];
  }

  /**
   * Destroy row, removing DOM elements and event listeners.
   */
  destroy() {
    this.nameDOM.remove();

    this.maxScoreDOM.remove();

    if (this.weightDOM instanceof HTMLInputElement) {
      this.weightDOM.removeEventListener('input', this.handleInput);
      this.weightDOM.removeEventListener('change', this.handleChanged);
    }
    this.weightDOM.remove();

    if (this.weightedMaxScoreDOM instanceof HTMLInputElement) {
      this.weightedMaxScoreDOM.removeEventListener('input', this.handleInput);
      this.weightedMaxScoreDOM.removeEventListener('change', this.handleChanged);
    }
    this.weightedMaxScoreDOM.remove();
  }

  /**
   * Get values relevant for saving parameters.
   * @returns {object} Values relevant for saving parameters.
   */
  getValues() {
    return {
      isTask: this.isTask(),
      weight: this.getWeight(),
    };
  }

  /**
   * Set visual precision for displaying values.
   * @param {number} visualPrecision Number of decimal places to display.
   */
  setVisualPrecision(visualPrecision) {
    this.visualPrecision = visualPrecision;

    this.update();
  }

  /**
   * Set whether weight is percentage or not.
   * @param {boolean} isPercentage True if weight is percentage, false otherwise.
   */
  setWeightIsPercentage(isPercentage) {
    this.weightIsPercentage = isPercentage;

    if (this.weightIsPercentage) {
      this.weightDOM.setAttribute('max', 100);
    }
    else {
      this.weightDOM.removeAttribute('max');
    }

    this.update();
  }
}
