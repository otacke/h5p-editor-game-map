import FieldHandler from './field-handler.js';

export default class LibraryHandler extends FieldHandler {

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
    const value = this.field.currentLibrary !== undefined && this.field.params.library ?
      this.field.currentLibrary.split(' ')[0] :
      undefined;

    return this.equals.includes(value);
  }
}
