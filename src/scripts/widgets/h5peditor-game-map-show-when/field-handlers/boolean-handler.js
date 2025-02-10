import FieldHandler from './field-handler.js';

export default class BooleanHandler extends FieldHandler {

  /**
   * @class
   * @param {object} field Field to handle.
   * @param {string|boolean} equals Value to compare against.
   */
  constructor(field, equals) {
    super(field, equals);
  }

  /**
   * Check whether the condition is satisfied.
   * @returns {boolean} True if the condition is satisfied, false otherwise.
   */
  satisfied() {
    return this.field.value === this.equals;
  }
}
