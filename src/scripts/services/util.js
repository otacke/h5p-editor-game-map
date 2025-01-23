import Color from 'color';

/** @constant {number} DOUBLE_CLICK_TIME_MS Double click time in ms. */
const DOUBLE_CLICK_TIME_MS = 300;

// TODO: Split into separate utility files (at least + H5PUtil)

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
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
   * @param {string} [cssLength] Length string.
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

  /**
   * Get root field.
   * @param {object} field H5P editor field.
   * @returns {null|object} H5P editor field.
   */
  static getRootField(field) {
    if (typeof field !== 'object') {
      return null;
    }

    let root = field;
    while (root.parent) {
      root = root.parent;
    }

    return root;
  }

  /**
   * Double click handler.
   * @param {Event} event Regular click event.
   * @param {function} callback Function to execute on doubleClick.
   */
  static doubleClick(event, callback) {
    const DOUBLE_CLICK_COUNT = 2;

    if (!event || typeof callback !== 'function') {
      return;
    }

    if (isNaN(event.target.count)) {
      event.target.count = 1;
    }
    else {
      event.target.count++;
    }

    setTimeout(() => {
      if (event.target.count === DOUBLE_CLICK_COUNT) {
        callback();
      }
      event.target.count = 0;
    }, DOUBLE_CLICK_TIME_MS);
  }

  /**
   * Determine whether a device supports touch events
   * @returns {boolean} True, if device supports touch events, else false.
   */
  static supportsTouch() {
    return (
      ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    );
  }

  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

  /**
   * Deep clone an object.
   *
   * `structuredClone()` can be used to replace the jQuery dependency (and this)
   * util function alltogether, when jQuery is removed from H5P core, but
   * currently it's not supported by Safari 15.4 which would mean to still
   * violate the latest 3 browsers rule.
   * @param {object} obj Object to clone.
   * @returns {object} Cloned object.
   */
  static clone(obj) {
    return window.structuredClone ?
      structuredClone(obj) :
      H5P.jQuery.extend(true, {}, obj);
  }

  /**
   * Get contrast color for text based on background color.
   * @param {string} backgroundColor Background color in common format.
   * @returns {string} Text color in common format.
   */
  static getTextContrastColor(backgroundColor) {
    return Color(backgroundColor).isDark() ? '#ffffff' : '#000000';
  }

  static findAllFields(fieldName, parent) {
    let found = [];

    if (parent.field?.name === fieldName) {
      return [parent];
    }
    else if (parent instanceof H5PEditor.List) {
      parent.forEachChild((child) => {
        found = [...found, ...Util.findAllFields(fieldName, child)];
      });
    }
    else if (parent.children) {
      parent.children.forEach((child) => {
        found = [...found, ...Util.findAllFields(fieldName, child)];
      });
    }

    return found;
  }

  /**
   * Override semantics with new properties/values.
   * @param {object|object[]} semantics Semantics to override.
   * @param {object} matchCriteria Criteria to match.
   * @param {object} newProperties New properties to set.
   */
  static overrideSemantics(semantics, matchCriteria = {}, newProperties = {}) {
    if (!Array.isArray(semantics)) {
      semantics = [semantics];
    }

    const traverse = (element) => {
      if (Object.keys(matchCriteria).every((key) => element[key] === matchCriteria[key])) {
        for (const key in newProperties) {
          element[key] = newProperties[key];
        }
      }

      if (element.type === 'group') {
        element.fields.forEach(traverse);
      }
      else if (element.type === 'list') {
        traverse(element.field);
      }
    };

    semantics.forEach((semantic) => {
      traverse(semantic);
    });
  }

  /**
   * Remove a field including the field instance from a form used with H5PEditor.processSemanticsChunk().
   * @param {string[]} fieldNames Field names to remove.
   * @param {object} semantics Semantics structure.
   * @param {HTMLElement} form Form DOM element.
   * @param {object} children Field instances.
   * @returns {object[]} Remaining field instances.
   */
  static removeFromForm(fieldNames = [], semantics, form, children) {
    const removeIndexes = [];

    // Remove DOM elements
    fieldNames.forEach((fieldName) => {
      // Fetch indexes of field instances from semantics.
      const index = semantics.findIndex((field) => field.name === fieldName);
      if (index !== -1) {
        removeIndexes.push(index);
      }

      Util.removeFormField(form, fieldName);
    });

    // Cloning, because the original may still be needed as a template
    const childrenClone = [...children];

    for (let i = removeIndexes.length - 1; i >= 0; i--) {
      childrenClone.splice(removeIndexes[i], 1);
    }

    return childrenClone;
  }

  /**
   * Remove a field from the form DOM created by H5PEditor.processSemanticsChunk()
   * @param {HTMLElement} parentDOM Parent DOM element (aka form).
   * @param {string} fieldName Field name to remove.
   */
  static removeFormField(parentDOM, fieldName) {
    let domElement = parentDOM.querySelector(`.field-name-${fieldName}`);

    /*
     * Workaround for list widget in H5P core that does not have "field-name" class but puts a lower-case identifier
     * onto the label child.
     */
    if (!domElement) {
      const label = parentDOM.querySelector(`label[for^="field-${fieldName.toLowerCase()}-"]`);
      domElement = label?.parentElement;
    }

    /*
     * Workaround for library widget in H5P core that does not have "field-name" class but puts a lower-case identifier
     * onto the select child.
     */
    if (!domElement) {
      const select = parentDOM.querySelector(`select[id^="field-${fieldName.toLowerCase()}-"]`);
      domElement = select?.parentElement;

    }

    if (domElement) {
      domElement.remove();
    }
  }
}
