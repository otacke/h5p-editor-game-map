import Table from './table/table.js';
import UtilDOM from '@services/util-dom.js';

import './main.scss';

export default class Main {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} params.title Title to display above table.
   * @param {string} params.description Description to display above table.
   * @param {boolean} params.weightIsPercentage Whether weights are percentages or absolute values.
   * @param {string} params.scalingMode Current scaling mode.
   * @param {object[]} params.scalingValues Current scaling values.
   * @param {number} params.totalScore Total score of exercise bundle.
   * @param {object} params.scalingModeInstance Editor widget instance of the scaling mode field.
   * @param {object} params.percentageInstance Editor widget instance of the percentage field.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChange Callback to call when values change.
   */
  constructor(params = {}, callbacks = {}) {
    this.callbacks = callbacks;
    this.callbacks.onChange = this.callbacks.onChange ?? (() => {});

    this.scalingModeInstance = params.scalingModeInstance;
    this.percentageInstance = params.percentageInstance;

    const { dom, table } = this.buildDOM(params);
    this.dom = dom;
    this.table = table;

    UtilDOM.callOnceVisible(this.dom, () => {
      this.percentageInstance.$item.get(0).classList.toggle('display-none', params.scalingMode !== 'weightedExercises');
    });
  }

  /**
   * Build DOM.
   * @param {object} params Parameters.
   * @param {string} params.title Title to display above table.
   * @param {string} params.description Description to display above table.
   * @param {boolean} params.weightIsPercentage Whether weights are percentages or absolute values.
   * @param {string} params.scalingMode Current scaling mode.
   * @param {object[]} params.scalingValues Current scaling values.
   * @param {number} params.totalScore Total score of exercise bundle.
   * @param {object} params.scalingModeInstance Editor widget instance of the scaling mode field.
   * @param {object} params.percentageInstance Editor widget instance of the percentage field.
   * @returns {object} Object containing DOM and table instance.
   */
  buildDOM(params = {}) {
    const dom = document.createElement('div');
    dom.classList.add('h5peditor-game-map-score-scaling-main');

    const title = document.createElement('div');
    title.classList.add('h5peditor-game-map-score-scaling-main-title');
    title.innerText = params.title;
    dom.appendChild(title);

    if (params.description) {
      const description = document.createElement('div');
      description.classList.add('h5peditor-game-map-score-scaling-main-description');
      description.innerText = params.description;
      dom.appendChild(description);
    }

    this.scalingModeInstance.appendTo(dom);
    this.scalingModeInstance.changes.push((value) => {
      this.handleScalingModeChanged(value);
    });

    const table = new Table(
      {
        dictionary: params.dictionary,
        rowTitle: params.rowTitle,
        weightTitle: params.weightTitle,
        maxScoreTitle: params.maxScoreTitle,
        scalingValues: params.scalingValues,
        scalingMode: params.scalingMode,
        weightIsPercentage: params.weightIsPercentage,
        totalScore: params.totalScore,
      },
      {
        onChange: () => {
          this.callbacks.onChange();
        },
      },
    );
    dom.appendChild(table.getDOM());

    this.percentageInstance.appendTo(dom);
    this.percentageInstance.changes.push((value) => {
      table.setWeightIsPercentage(value);
    });

    return { dom, table };
  }

  /**
   * Handle scaling mode changed to update table and show/hide percentage option.
   * @param {string} mode New scaling mode.
   */
  handleScalingModeChanged(mode) {
    this.percentageInstance.$item.get(0).classList.toggle('display-none', mode !== 'weightedExercises');

    const percentageCheckbox = this.percentageInstance.$input.get(0);
    percentageCheckbox.checked = false; // Intentionally set to false
    percentageCheckbox.dispatchEvent(new Event('change'));

    const rebuildParams = {};
    if (mode !== 'weightedExercises') {
      rebuildParams.totalScore = this.table.getComputedWeightedTotalScore();
    }

    const oldTableDOM = this.table.getDOM();
    this.table.setWeightIsPercentage(mode === 'weightedExercises' ? this.percentageInstance.value : false);
    this.table.setScalingMode(mode);
    this.table.rebuild(rebuildParams);
    oldTableDOM.replaceWith(this.table.getDOM());
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get values to save as content parameters.
   * @returns {object} Values object.
   */
  getValues() {
    const isWeightedExercises = this.scalingModeInstance.value === 'weightedExercises';

    return {
      weightIsPercentage: isWeightedExercises ? this.percentageInstance.value : false,
      totalScore: this.table.getWeightedTotalScore(),
      scoreScalingList: this.table.getValues().map((values) => this.serializeScalingItem(values)),
    };
  }

  /**
   * Remove self. Invoked via H5P core.
   */
  remove() {
    this.table.destroy();
    this.dom.remove();
  }

  /**
   * Serialize a scaling item for storage as content parameters.
   * @param {object} values Scaling item values.
   * @returns {object} Serialized scaling item.
   */
  serializeScalingItem(values) {
    let weight = typeof values.weight === 'number' ? values.weight : parseFloat(values.weight);
    weight = isNaN(weight) ? 1 : weight;

    return {
      ...values,
      weight: weight.toString(), // We only have a "text" field even for decimals.
    };
  }

  /**
   * Update values in table and percentage field.
   * @param {object} values Values object.
   */
  updateValues(values) {
    this.percentageInstance.$input.get(0).checked = values.weightIsPercentage;
    this.percentageInstance.$input.get(0).dispatchEvent(new Event('change'));

    this.table.updateScalingValues(values.scoreScalingList);
  }
}
