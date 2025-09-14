import Color from 'color';

/** Class for utility functions */
export default class UtilCSS {
  /**
   * Retrieves value and unit of a CSS length string.
   * Will interpret a number without a unit as px.
   * @param {string} [cssLength] Length string.
   * @returns {null|object} Null if string cannot be parsed or value + unit.
   */
  static parseCSSLengthProperty(cssLength = '') {
    if (typeof cssLength !== 'string') {
      return null;
    }

    // Cmp. https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units
    // eslint-disable-next-line @stylistic/js/max-len
    const regex = /((?:\d*\.)*\d+)(?:\s)*(cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|rlh|vw|vh|vmin|vmax|vb|vi|svw|svh|lvw|lvh|dvw|dvh)?/;
    const match = cssLength.match(regex);

    if (!match) {
      return null;
    }

    return {
      value: parseFloat(match[1]),
      unit: match[2] || 'px',
    };
  }

  /**
   * Get contrast color for text based on background color.
   * @param {string} backgroundColor Background color in common format.
   * @returns {string} Text color in common format.
   */
  static getTextContrastColor(backgroundColor) {
    return Color(backgroundColor).isDark() ? '#ffffff' : '#000000';
  }
}
