import Dictionary from '@services/dictionary.js';
import Main from './components/main.js';
import './h5peditor-game-map-score-scaling.scss';

/** Class for "Score scaling" H5P widget */
export default class GameMapScoreScaling {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params = {}, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;

    this.dictionary = new Dictionary();
    this.fillDictionary();

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-game-map-score-scaling',
    });

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, this.setValue);
    this.fieldInstance.appendTo(this.$container);

    const listField = this.field.fields.find((field) => field.name === 'scoreScalingList');
    const scalingModeInstance = this.fieldInstance.children.find((child) => child.field.name === 'scalingMode');
    const percentageInstance = this.fieldInstance.children.find((child) => child.field.name === 'weightIsPercentage');

    this.main = new Main(
      {
        dictionary: this.dictionary,
        title: listField.label,
        description: listField.description,
        weightIsPercentage: this.params.weightIsPercentage,
        scalingMode: this.params.scalingMode,
        scalingValues: this.params.scoreScalingList,
        scalingModeInstance: scalingModeInstance,
        percentageInstance: percentageInstance,
        totalScore: this.params.totalScore,
      },
      {
        onChange: () => {
          this.handleValueChange();
        },
      },
    );
    this.fieldInstance.$content.get(0).remove();
    this.fieldInstance.$content = H5P.jQuery(this.main.getDOM());
    this.fieldInstance.$group.get(0).append(this.fieldInstance.$content.get(0));

    // Relay changes
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push(() => {
        this.handleFieldChange();
      });
    }

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');
  }

  /**
   * Handle change of values in main component and set updated values tp content parameters.
   */
  handleValueChange() {
    if (!this.main) {
      return; // Still initializing, nothing will have changed
    }
    const currentValues = this.main.getValues();

    this.params.weightIsPercentage = currentValues.weightIsPercentage;
    this.params.totalScore = currentValues.totalScore;

    this.params.scoreScalingList.forEach((listItem, index) => {
      Object.assign(listItem, currentValues.scoreScalingList[index]);
    });

    this.setValue(this.params);
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    $wrapper.get(0).append(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.main.remove();
    this.$container.get(0).remove();
  }

  /**
   * Handle change of field.
   */
  handleFieldChange() {
    this.params = this.fieldInstance.params;
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Update scoring values in table and percentage field.
   * @param {object} scoringValues New scoring values.
   */
  updateValues(scoringValues) {
    this.params.scoreScalingList = scoringValues.map((newObject) => {
      const existingObject = this.params.scoreScalingList
        .find((oldObject) => oldObject.subContentId === newObject.subContentId);

      newObject.weight = existingObject?.weight ?? (!!this.params.weightIsPercentage ? '100' : '1');

      return newObject;
    });

    this.setValue(this.params);

    this.main.updateValues(structuredClone(this.params));
  }

  /**
   * Fill Dictionary.
   */
  fillDictionary() {
    // Convert H5PEditor language strings into object.
    const plainTranslations =
      H5PEditor.language['H5PEditor.GameMap'].libraryStrings || {};
    const translations = {};

    for (const key in plainTranslations) {
      let current = translations;
      // Assume string keys separated by . or / for defining path
      const splits = key.split(/[./]+/);
      const lastSplit = splits.pop();

      // Create nested object structure if necessary
      splits.forEach((split) => {
        if (!current[split]) {
          current[split] = {};
        }
        current = current[split];
      });

      // Add translation string
      current[lastSplit] = plainTranslations[key];
    }

    this.dictionary.fill(translations);
  }
}
