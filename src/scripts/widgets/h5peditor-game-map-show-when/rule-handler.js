/** @constant {string} TYPE_AND AND operator name. */
export const TYPE_AND = 'and';

/** @constant {string} TYPE_OR OR operator name. */
export const TYPE_OR = 'or';

export default class RuleHandler {

  /**
   * @class
   * @param {string} [type] Rule type.
   */
  constructor(type = TYPE_OR) {
    this.type = type;
    this.handlers = [];
  }

  /**
   * Add a handler.
   * @param {object} handler Handler to add.
   */
  add(handler) {
    this.handlers.push(handler);
  }

  /**
   * Check whether all handlers' rules are satisfied.
   * @returns {boolean} True if all rules are satisfied, false otherwise.
   */
  rulesSatisfied() {
    if (this.type === TYPE_OR) {
      return this.handlers.some((handler) => handler.satisfied());
    }
    else if (this.type === TYPE_AND) {
      return this.handlers.every((handler) => handler.satisfied());
    }

    return false;
  }
}
