import Util from '@services/util.js';
import Row from './row.js';
import './table.scss';

/** @constant {number} PRECISION Default visual precision for floats. */
const PRECISION = 2;

/** @constant {string} NO_VALUE_STRING String to display when there is no value to show. */
const NO_VALUE_STRING = '---';

export default class Table {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChange Called when a value in the table changes.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onChange: () => {},
    }, callbacks);

    this.visualPrecision = PRECISION;

    this.setTotalScore(params.totalScore ?? 0);
    this.handleTotalScoreInput = this.handleTotalScoreInput.bind(this);
    this.handleTotalScoreChanged = this.handleTotalScoreChanged.bind(this);

    this.rebuild(params);
  }

  /**
   * Set total score and update DOM.
   * @param {number|string} totalScore Total score to set.
   */
  setTotalScore(totalScore) {
    const isNoValue = typeof totalScore === 'string';
    const scoreIsValid = typeof totalScore === 'number' && totalScore >= 0;

    this.totalScore = scoreIsValid ? totalScore : 0;

    if (!this.weightedTotalScoreDOM) {
      return;
    }

    if (isNoValue) {
      this.weightedTotalScoreDOM.innerText = totalScore;
      return;
    }

    if (this.params.scalingMode === 'totalScore') {
      this.weightedTotalScoreDOM.value = Math.round(this.totalScore);
    }
    else {
      this.weightedTotalScoreDOM.innerText = this.totalScore.toFixed(this.visualPrecision);
    }
  }

  /**
   * Handle input event on total score input, ensuring that only valid characters are entered.
   */
  handleTotalScoreInput() {
    const valueForcedInteger = this.weightedTotalScoreDOM.value.replace(/[^0-9]/g, '');
    if (valueForcedInteger !== this.weightedTotalScoreDOM.value) {
      this.setTotalScore(valueForcedInteger);
    }
  }

  /**
   * Handle change event on total score input, ensuring that the value is set and table is updated accordingly.
   */
  handleTotalScoreChanged() {
    this.setTotalScore(parseInt(this.weightedTotalScoreDOM.value) || 0);
    this.update();
  }

  /**
   * Rebuild table with new parameters.
   * @param {object} params Parameters.
   * @param {object} params.dictionary Dictionary for translations.
   * @param {string} params.scalingMode Scaling mode, either 'weightedExercises', 'totalScore' or 'maxScore'.
   * @param {number} params.totalScore Total score to scale to, only used in 'totalScore' scaling mode.
   * @param {object[]} params.scalingValues Array of scaling values for each exercise.
   * @param {boolean} params.weightIsPercentage Whether weights are represented as percentages.
   */
  rebuild(params = {}) {
    const rebuildParams = Util.extend({}, this.params, params);

    if (rebuildParams.scalingMode === 'totalScore') {
      rebuildParams.totalScore = Math.round(rebuildParams.totalScore);
    }

    const { dom, errorsDOM, weightedTotalScoreDOM } = this.buildDOM({
      dictionary: rebuildParams.dictionary,
      scalingMode: rebuildParams.scalingMode,
      totalScore: rebuildParams.totalScore,
    });
    this.dom = dom;
    this.errorsDOM = errorsDOM;
    this.weightedTotalScoreDOM = weightedTotalScoreDOM;

    this.updateScalingValues(rebuildParams.scalingValues);
    this.setWeightIsPercentage(rebuildParams.weightIsPercentage);
  }

  /**
   * Build DOM for table.
   * @param {object} params Parameters.
   * @param {object} params.dictionary Dictionary for translations.
   * @param {string} params.scalingMode Scaling mode, either 'weightedExercises', 'totalScore' or 'maxScore'.
   * @param {number} params.totalScore Total score to scale to, only used in 'totalScore' scaling mode.
   * @returns {object} DOM elements.
   */
  buildDOM(params = {}) {
    (this.rows ?? []).forEach((row) => {
      row.destroy();
    });

    const dom = document.createElement('div');
    dom.classList.add('h5peditor-game-map-score-scaling-table-container');

    const table = document.createElement('div');
    table.classList.add('h5peditor-game-map-score-scaling-table');
    dom.append(table);

    this.buildTitleRow({ dictionary: params.dictionary }).forEach((element) => {
      table.append(element);
    });

    const dividerTop = document.createElement('div');
    dividerTop.classList.add('h5peditor-game-map-score-scaling-table-divider-top');
    table.append(dividerTop);

    // Exercise rows will be inserted here programmatically in updateScalingValues()

    const dividerBottom = document.createElement('div');
    dividerBottom.classList.add('h5peditor-game-map-score-scaling-table-divider-bottom');
    table.append(dividerBottom);

    const totalRow = this.buildTotalRow({
      rowTitle: 'Total',
      weightedMaxScore: NO_VALUE_STRING,
      scalingMode: params.scalingMode,
      totalScore: params.totalScore,
    });
    totalRow.forEach((element) => {
      table.append(element);
    });

    const errorsDOM = document.createElement('div');
    errorsDOM.classList.add('h5peditor-game-map-score-scaling-table-errors', 'h5p-errors', 'display-none');
    dom.append(errorsDOM);

    return {
      dom,
      errorsDOM,
      weightedTotalScoreDOM: totalRow.find((element) => {
        return element.classList.contains('h5peditor-game-map-score-scaling-table-weighted-max-score');
      }),
    };
  }

  /**
   * Build title row of the table.
   * @param {object} params Parameters.
   * @param {object} params.dictionary Dictionary for translations.
   * @returns {HTMLElement[]} Array of DOM elements for the title row.
   */
  buildTitleRow(params = {}) {
    const exerciseNameDOM = document.createElement('div');
    exerciseNameDOM.classList.add('h5peditor-game-map-score-scaling-table-exercise-name', 'title-row');
    exerciseNameDOM.innerText = params.dictionary.get('l10n.contentTitle');

    const weightDOM = document.createElement('div');
    weightDOM.classList.add('h5peditor-game-map-score-scaling-table-weight', 'title-row');
    weightDOM.setAttribute('aria-label', params.dictionary.get('a11y.weight'));
    H5P.Tooltip(weightDOM);

    const weightSymbol = document.createElement('span');
    weightSymbol.classList.add('h5peditor-game-map-score-scaling-table-weight-symbol');
    weightSymbol.setAttribute('aria-hidden', 'true');
    weightDOM.append(weightSymbol);

    const weightText = document.createElement('span');
    weightText.classList.add('h5peditor-game-map-score-scaling-table-weight-text', 'visually-hidden');
    weightText.innerText = params.dictionary.get('a11y.weight');
    weightDOM.append(weightText);

    const maxScoreDOM = document.createElement('div');
    maxScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-max-score', 'title-row');
    maxScoreDOM.setAttribute('aria-label', params.dictionary.get('a11y.maxScore'));
    H5P.Tooltip(maxScoreDOM);

    const maxScoreSymbol = document.createElement('span');
    maxScoreSymbol.classList.add('h5peditor-game-map-score-scaling-table-max-score-symbol');
    maxScoreSymbol.setAttribute('aria-hidden', 'true');
    maxScoreDOM.append(maxScoreSymbol);

    const maxScoreText = document.createElement('span');
    maxScoreText.classList.add('h5peditor-game-map-score-scaling-table-max-score-text', 'visually-hidden');
    maxScoreText.innerText = params.dictionary.get('a11y.maxScore');
    maxScoreDOM.append(maxScoreText);

    const weightedMaxScoreDOM = document.createElement('div');
    weightedMaxScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-weighted-max-score', 'title-row');
    weightedMaxScoreDOM.setAttribute('aria-label', params.dictionary.get('a11y.weightedMaxScore'));
    H5P.Tooltip(weightedMaxScoreDOM);

    const weightedMaxScoreSymbol = document.createElement('span');
    weightedMaxScoreSymbol.classList.add('h5peditor-game-map-score-scaling-table-weighted-max-score-symbol');
    weightedMaxScoreSymbol.setAttribute('aria-hidden', 'true');
    weightedMaxScoreDOM.append(weightedMaxScoreSymbol);

    const weightedMaxScoreText = document.createElement('span');
    weightedMaxScoreText.classList.add(
      'h5peditor-game-map-score-scaling-table-weighted-max-score-text', 'visually-hidden',
    );
    weightedMaxScoreText.innerText = params.dictionary.get('a11y.weightedMaxScore');
    weightedMaxScoreDOM.append(weightedMaxScoreText);

    return [exerciseNameDOM, weightDOM, maxScoreDOM, weightedMaxScoreDOM];
  }

  /**
   * Build total row of the table.
   * @param {object} params Parameters.
   * @param {string} params.rowTitle Title for the row.
   * @param {string|number} params.weightedMaxScore Weighted max score to display in the row.
   * @param {string} params.scalingMode Scaling mode, either 'weightedExercises', 'totalScore' or 'maxScore'.
   * @param {number} params.totalScore Total score to scale to, only used in 'totalScore' scaling mode.
   * @returns {HTMLElement[]} Array of DOM elements for the total row.
   */
  buildTotalRow(params = {}) {
    const exerciseNameDOM = document.createElement('div');
    exerciseNameDOM.classList.add('h5peditor-game-map-score-scaling-table-exercise-name', 'bottom-row');
    exerciseNameDOM.innerText = params.rowTitle;

    const maxScoreDOM = document.createElement('div');
    maxScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-max-score', 'bottom-row');

    const weightDOM = document.createElement('div');
    weightDOM.classList.add('h5peditor-game-map-score-scaling-table-weight', 'bottom-row');

    let weightedTotalScoreDOM;
    if (params.scalingMode === 'totalScore') {
      weightedTotalScoreDOM = document.createElement('input');
      weightedTotalScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-weighted-max-score', 'bottom-row');
      weightedTotalScoreDOM.type = 'number';
      weightedTotalScoreDOM.step = 1;
      weightedTotalScoreDOM.inputMode = 'numeric';
      weightedTotalScoreDOM.min = 0;
      weightedTotalScoreDOM.value = params.totalScore;
      weightedTotalScoreDOM.addEventListener('input', (event) => {
        this.handleTotalScoreInput();
      });
      weightedTotalScoreDOM.addEventListener('change', () => {
        this.handleTotalScoreChanged();
      });
    }
    else {
      weightedTotalScoreDOM = document.createElement('div');
      weightedTotalScoreDOM.classList.add('h5peditor-game-map-score-scaling-table-weighted-max-score', 'bottom-row');
      weightedTotalScoreDOM.innerText = params.weightedMaxScore;
    }

    return [exerciseNameDOM, weightDOM, maxScoreDOM, weightedTotalScoreDOM];
  }

  /**
   * Update table with new scaling values.
   * @param {object[]} scalingValues Scaling values for each exercise.
   * @param {boolean} scalingValues[].isTask Whether the row represents a task or not.
   * @param {string} scalingValues[].title Title of the exercise.
   * @param {string} scalingValues[].subContentId Sub content ID of the exercise.
   * @param {number} scalingValues[].maxScore Max score for the exercise.
   * @param {number} scalingValues[].weight Weight for the exercise, used in 'weightedExercises' scaling mode.
   */
  updateScalingValues(scalingValues) {
    const oldRowValues = (this.rows ?? []).map((row) => {
      return {
        weight: row.getWeight(),
        weightedMaxScore: row.getWeightedMaxScore(),
      };
    });

    (this.rows ?? []).forEach((row) => {
      row.destroy();
    });

    this.rows = (scalingValues || []).map((scalingValue, index) => {
      const rowParams = {
        index: index,
        isTask: scalingValue.isTask,
        name: scalingValue.title ?? scalingValue.subContentId ?? '',
        maxScore: scalingValue.maxScore,
        weightIsPercentage: this.params.weightIsPercentage,
        scalingMode: this.params.scalingMode,
        visualPrecision: this.visualPrecision,
      };

      if (oldRowValues[index]?.weight && typeof oldRowValues[index].weight === 'number') {
        rowParams.weight = oldRowValues[index].weight;
      }
      else {
        rowParams.weight = scalingValue.weight;
      }

      if (oldRowValues[index]?.weightedMaxScore && typeof oldRowValues[index].weightedMaxScore === 'number') {
        rowParams.weightedMaxScore = oldRowValues[index].weightedMaxScore;
      }

      return new Row(
        rowParams,
        {
          onChange: (rowParams = {}) => {
            this.handleRowChange(rowParams);
          },
        },
      );
    });

    let nodeToAppendAfter = this.dom.querySelector('.h5peditor-game-map-score-scaling-table-divider-top');

    const newNodes = this.rows.map((row) => row.getDOMs()).flat();
    newNodes.forEach((node) => {
      nodeToAppendAfter.insertAdjacentElement('afterend', node);
      nodeToAppendAfter = node;
    });

    this.update();
  }

  /**
   * Handle change in row.
   * @param {object} rowParams Parameters of changed row.
   * @param {number} rowParams.index Index of changed row.
   * @param {boolean} rowParams.isTask Whether row represents a task or not.
   * @param {string} rowParams.name Name of exercise.
   * @param {number} rowParams.maxScore Max score for exercise.
   * @param {number} rowParams.weight Weight for exercise, used in 'weightedExercises' scaling mode.
   */
  handleRowChange(rowParams = {}) {
    if (this.params.scalingMode === 'weightedExercises' && this.params.weightIsPercentage) {
      this.limitWeightTo100Percent(rowParams.index);
    }

    this.update();
  }

  /**
   * Limit the sum of weights to 100% by reducing the weights of other rows.
   * @param {number} changedRowIndex Index of the row that was changed.
   */
  limitWeightTo100Percent(changedRowIndex) {
    const sumOfWeights = this.rows.reduce((total, row) => {
      return total + (row.isTask() ? row.getWeight() : 0);
    }, 0);

    if (sumOfWeights <= 100) {
      return;
    }

    let remainingExcessWeight = sumOfWeights - 100;

    const rowsToReduce = this.rows
      .filter((row) => row.isTask() && row.index !== changedRowIndex)
      .sort((a, b) => b.getWeight() - a.getWeight());

    if (rowsToReduce.length === 0) {
      return;
    }

    const reductionTarget = Math.ceil(remainingExcessWeight / rowsToReduce.length);

    rowsToReduce.forEach((row) => {
      if (remainingExcessWeight <= 0) {
        return;
      }

      const reductionAmount = Math.min(remainingExcessWeight, reductionTarget);
      remainingExcessWeight = remainingExcessWeight - reductionAmount;
      row.setWeight(row.getWeight() - reductionAmount);
    });
  }

  /**
   * Set whether weights are represented as percentages and update rows accordingly.
   * @param {boolean} isPercentage True if weights should be represented as percentages, false otherwise.
   */
  setWeightIsPercentage(isPercentage) {
    this.params.weightIsPercentage = isPercentage;

    this.rows.forEach((row) => {
      row.setWeightIsPercentage(isPercentage);
    });

    this.update();
  }

  /**
   * Update table based on current scaling values and total score.
   */
  update() {
    const noRowIsTask = !this.rows.some((row) => row.isTask());
    if (noRowIsTask) {
      this.setTotalScore(NO_VALUE_STRING);

      return;
    }

    if (this.params.scalingMode === 'weightedExercises') {
      this.setTotalScore(this.computeTotalScore());
    }
    else if (this.params.scalingMode === 'totalScore') {
      const totalExerciseMaxScore = this.rows.reduce((total, row) => {
        return total + (row.isTask() ? row.getMaxScore() : 0);
      }, 0);

      const newWeight = this.totalScore / totalExerciseMaxScore;

      this.rows.forEach((row) => {
        if (!row.isTask()) {
          return;
        }

        row.setWeight(newWeight);
      });
    }
    else if (this.params.scalingMode === 'maxScore') {
      this.setTotalScore(this.computeTotalScore());
    }

    this.updateVisualPrecision();
    this.checkSumOfWeights();

    this.callbacks.onChange();
  }

  /**
   * Compute total score based on current weights and max scores of exercises.
   * @returns {number} Total score.
   */
  computeTotalScore() {
    return this.rows.reduce((total, row) => {
      return total + (row.isTask() ? row.getWeightedMaxScore() : 0);
    }, 0);
  }

  /**
   * Update visual precision based on what values are set throughout the table.
   */
  updateVisualPrecision() {
    if (this.params.scalingMode === 'weightedExercises') {
      const someRowHasFloatingPointWeightedMaxScore = this.rows.some((row) => {
        return row.isTask() && !Number.isInteger(row.getWeightedMaxScore());
      });

      this.visualPrecision = someRowHasFloatingPointWeightedMaxScore ? PRECISION : 0;
      this.rows.forEach((row) => {
        row.setVisualPrecision(this.visualPrecision);
      });
    }
    else if (this.params.scalingMode === 'totalScore') {
      const totalExerciseMaxScore = this.rows.reduce((total, row) => {
        return total + (row.isTask() ? row.getMaxScore() : 0);
      }, 0);

      const newWeight = this.totalScore / totalExerciseMaxScore;
      const weightIsFloatingPoint = !Number.isInteger(newWeight);

      this.visualPrecision = weightIsFloatingPoint ? PRECISION : 0;
      this.rows.forEach((row) => {
        row.setVisualPrecision(this.visualPrecision);
      });
    }
    else if (this.params.scalingMode === 'maxScore') {
      const someRowHasFloatingPointWeight = this.rows.some((row) => {
        return row.isTask() && !Number.isInteger(row.getWeight());
      });

      this.visualPrecision = someRowHasFloatingPointWeight ? PRECISION : 0;
      this.rows.forEach((row) => {
        row.setVisualPrecision(this.visualPrecision);
      });
    }

    this.setTotalScore(this.computeTotalScore());
  }

  /**
   * Check that the sum of weights is 100% and set an error if not.
   */
  checkSumOfWeights() {
    if (this.params.scalingMode !== 'weightedExercises' || !this.params.weightIsPercentage) {
      return;
    }

    const sumOfWeights = this.rows.reduce((total, row) => {
      return total + (row.isTask() ? row.getWeight() : 0);
    }, 0);

    // eslint-disable-next-line no-magic-numbers
    const tolerance = Math.pow(10, -this.visualPrecision);
    if (Math.abs(sumOfWeights - 100) > tolerance) {
      const errorText = this.params.dictionary.get('l10n.errorTotalWeightMustBe100')
        .replace('@current', sumOfWeights.toFixed(0));

      this.setError(errorText);
    }
    else {
      this.clearError();
    }
  }

  /**
   * Set error message.
   * @param {string} message Error message to display.
   */
  setError(message) {
    if (typeof message !== 'string' || message.trim() === '') {
      this.clearError();
      return;
    }

    this.errorsDOM.innerHTML = `<p>${message}</p>`;
    this.errorsDOM.classList.remove('display-none');
  }

  /**
   * Clear error message.
   */
  clearError() {
    this.setError('');
    this.errorsDOM.classList.add('display-none');
  }

  /**
   * Destroy table.
   */
  destroy() {
    this.rows.forEach((row) => {
      row.destroy();
    });
    this.weightedTotalScoreDOM?.removeEventListener('input', this.handleTotalScoreInput);
    this.weightedTotalScoreDOM?.removeEventListener('change', this.handleTotalScoreChanged);
    this.errorsDOM?.remove();
    this.dom?.remove();
  }

  /**
   * Get computed weighted total score based on current weights and max scores of exercises, regardless of scaling mode.
   * @returns {number} Computed weighted total score.
   */
  getComputedWeightedTotalScore() {
    return this.rows.reduce((total, row) => {
      return total + (row.isTask() ? row.getWeightedMaxScore() : 0);
    }, 0);
  }

  /**
   * Get DOM for table.
   * @returns {HTMLElement} DOM element for table.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get total score.
   * @returns {number|string} Total score.
   */
  getTotalScore() {
    return this.totalScore;
  }

  /**
   * Get values for each row in the table.
   * @returns {object[]} Values for each row.
   */
  getValues() {
    return this.rows.map((row) => row.getValues());
  }

  /**
   * Get weighted total score based on current weights and max scores of exercises.
   * @returns {number|undefined} Weighted total score.
   */
  getWeightedTotalScore() {
    if (this.params.scalingMode === 'weightedExercises') {
      return; // Must be computed from weights
    }

    return parseFloat(this.totalScore);
  }

  /**
   * Set scaling mode and update table accordingly.
   * @param {string} scalingMode Scaling mode, either 'weightedExercises', 'totalScore' or 'maxScore'.
   */
  setScalingMode(scalingMode) {
    this.params.scalingMode = scalingMode;

    if (scalingMode !== 'weightedExercises') {
      this.setWeightIsPercentage(false);
    }
  }
}
