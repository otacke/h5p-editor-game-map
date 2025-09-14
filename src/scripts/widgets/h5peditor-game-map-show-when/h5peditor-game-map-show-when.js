import FieldHandlerFactory from './field-handler-factory.js';
import RuleHandler from './rule-handler.js';
import './h5peditor-game-map-show-when.scss';

/*
 * Custom implementation of the ShowWhen widget, because the original ShowWhen does not
 * pass through relevant fields of the field that it enhances and we cannot wait for
 * H5P Group to fix this.
 * @see {@link https://github.com/h5p/h5p-editor-show-when/pull/12}
 * TODO: Simply use H5PEditor.ShowWhen instead if H5P Group ever tackles HFP-4196.
 */
export default class GameMapShowWhen {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.field = field;
    this.passReadies = true;
    this.value = params;

    // Allow other fields to listen to changes to original field
    this.changes = [];

    this.$wrapper = H5P.jQuery('<div>', {
      class: 'field h5p-editor-widget-game-map-show-when',
    });
    this.showing = false;

    const config = this.field.gamemapshowwhen;

    if (!config) {
      throw new Error(
        'You need to set the showWhen property in semantics.json when using the showWhen widget',
      );
    }

    this.ruleHandler = new RuleHandler(config.type);

    config.rules.forEach((rule) => {
      const targetField = H5PEditor.findField(rule.field, parent);
      const handler = FieldHandlerFactory.create(targetField, rule.equals);

      if (!handler) {
        return;
      }

      this.ruleHandler.add(handler);

      H5PEditor.followField(parent, rule.field, () => {
        const rulesSatisfied = this.ruleHandler.rulesSatisfied();

        if (config.detach) {
          if (this.showing === rulesSatisfied) {
            return;
          }
          this.showing = rulesSatisfied;
          if (this.showing) {
            this.$wrapper.appendTo(this.$container);
          }
          else {
            this.$wrapper.detach();
          }
        }
        else {
          this.showing = rulesSatisfied;
          this.$wrapper.toggleClass('display-none', !this.showing);
        }

        if (config.nullWhenHidden && !rulesSatisfied) {
          setValue(this.field, undefined);
        }
      });
    });

    this.fieldInstance = new H5PEditor.widgets[config.widget || field.type](parent, field, params, setValue);
    this.fieldInstance.appendTo(this.$wrapper);

    // The original ShowWhen widget is missing this feature.
    this.children = this.fieldInstance.children;

    // The original ShowWhen widget does not relay changes from the original field, not needed here though.
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push((value) => {
        this.changes.forEach((change) => {
          this.value = value;
          change(value);
        });
      });
    }

    if (typeof this.fieldInstance.change === 'function') {
      this.change = (callback) => {
        this.fieldInstance.change(callback);
      };
    }
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $container Wrapping container.
   */
  appendTo($container) {
    if (!this.field.gamemapshowwhen.detach) {
      $container.get(0).append(this.$wrapper.get(0));
    }
    this.$container = $container;
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.showing ? this.fieldInstance.validate() : true;
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.get(0).remove();
  }
}

