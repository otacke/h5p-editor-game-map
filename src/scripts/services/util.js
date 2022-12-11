/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   *
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Retrieves value and unit of a CSS length string.
   * Will interpret a number without a unit as px.
   *
   * @param {string} [cssLength=''] Length string.
   * @returns {null|object} Null if string cannot be parsed or value + unit.
   */
  static parseCSSLengthProperty(cssLength = '') {
    if (typeof cssLength !== 'string') {
      return null;
    }

    // Cmp. https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units
    const regex = /((?:\d*\.)*\d+)(?:\s)*(cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|rlh|vw|vh|vmin|vmax|vb|vi|svw|svh|lvw|lvh|dvw|dvh)?/;
    const match = cssLength.match(regex);

    if (!match) {
      return null;
    }

    return {
      value: parseFloat(match[1]),
      unit: match[2] || 'px'
    };
  }
}
