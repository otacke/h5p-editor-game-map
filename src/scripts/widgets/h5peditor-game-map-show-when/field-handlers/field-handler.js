export default class FieldHandler {

  /**
   * @class
   * @param {object} field Field to handle.
   * @param {string|boolean} equals Value to compare against.
   */
  constructor(field, equals) {
    this.field = field;

    if (typeof equals === 'string') {
      this.equals = [equals];
    }
    else {
      this.equals = equals;
    }
  }

  /**
   * Check whether the condition is satisfied.
   * returns {boolean} True if the condition is satisfied, false otherwise.
   */
  satisfied() {
    throw new Error('Must be implemented by subclass');
  }
}
