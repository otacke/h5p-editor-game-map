import LibraryHandler from './field-handlers/library-handler.js';
import SelectHandler from './field-handlers/select-handler.js';
import BooleanHandler from './field-handlers/boolean-handler.js';

export default class FieldHandlerFactory {

  /**
   * Produce a field handler.
   * @param {object} field - The field to handle.
   * @param {string} equals - The value to compare against.
   * @returns {object} - The field handler `FieldHandler`.
   * @static
   */
  static create(field, equals) {
    switch (field.field.type) {

      case 'library':
        return new LibraryHandler(field, equals);

      case 'select':
        return new SelectHandler(field, equals);

      case 'boolean':
        return new BooleanHandler(field, equals);

      default:
        return null;
    }
  }
}
