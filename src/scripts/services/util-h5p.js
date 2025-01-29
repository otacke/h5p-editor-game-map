/** Class for H5P utility functions */
export default class UtilH5P {
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
   * Find all fields with a specific name in a semantics structure.
   * @param {string} fieldName Field name to search for.
   * @param {object} parent Parent object to search in.
   * @returns {object[]} Found fields.
   */
  static findAllFields(fieldName, parent) {
    let found = [];

    if (parent.field?.name === fieldName) {
      return [parent];
    }
    else if (parent instanceof H5PEditor.List) {
      parent.forEachChild((child) => {
        found = [...found, ...UtilH5P.findAllFields(fieldName, child)];
      });
    }
    else if (parent.children) {
      parent.children.forEach((child) => {
        found = [...found, ...UtilH5P.findAllFields(fieldName, child)];
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

      UtilH5P.removeFormField(form, fieldName);
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
