import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Util from '@services/util.js';
import MapEditor from '@components/map-editor/map-editor.js';
import ParentReadyInitialization from '@mixins/parent-ready-initialization.js';
import './h5peditor-game-map.scss';

/** Class for Boilerplate H5P widget */
export default class GameMap {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    Util.addMixins(
      GameMap, [ParentReadyInitialization]
    );

    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      elements: [],
      paths: [],
    }, params);
    this.setValue = setValue;

    this.dictionary = new Dictionary();
    this.fillDictionary();

    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('getStylePropertyValue', (key) => {
      return this.dom.style.getPropertyValue(key);
    });

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.dom = this.buildDOM();
    this.$container = H5P.jQuery(this.dom);

    // TODO: Don't pass these as globals, but as parameters

    // Create template for elements group field
    const elementsGroup = this.field.fields.find((field) => field.name === 'elements').field;
    const elementsGroupTemplate = {
      type: elementsGroup.type,
      parent: this,
      field: elementsGroup,
      params: this.params.elements,
      setValue: (value) => {} // No setValue needed
    };

    // Create template for paths group field
    const pathsGroup = this.field.fields.find((field) => field.name === 'paths').field;
    const pathsGroupTemplate = {
      type: pathsGroup.type,
      parent: this,
      field: pathsGroup,
      params: this.params.paths,
      setValue: (value) => {} // No setValue needed
    };

    // Ensure that dynamically set stageScoreId select options are available to match saved params.
    const stageScoreIdOptions = this.params.elements.map((element) => ({ value: element.id, label: element.label }));
    const elementsFields = H5P.cloneObject(elementsGroup.fields, true);
    Util.overrideSemantics(elementsFields, { name: 'stageScoreId', type: 'select' }, { options: stageScoreIdOptions });

    // Map canvas
    this.mapEditor = new MapEditor(
      {
        backgroundColor: this.params.backgroundColor,
        dictionary: this.dictionary,
        globals: this.globals,
        elementsGroupTemplate: elementsGroupTemplate,
        elements: this.params.elements,
        elementsFields: elementsFields,
        pathsGroupTemplate: pathsGroupTemplate,
        paths: this.params.paths,
        pathFields: H5P.cloneObject(pathsGroup.fields, true),
      },
      {
        onChanged: (elements, paths) => {
          this.setMapValues(elements, paths);
        }
      }
    );
    this.dom.appendChild(this.mapEditor.getDOM());

    window.addEventListener('resize', () => {
      this.mapEditor.resize();
    });

    this.parent.ready(() => {
      this.handleParentReady();
    });
  }

  /**
   * Ready handler.
   * @param {function} ready Ready callback.
   */
  ready(ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      window.requestAnimationFrame(() => {
        ready();
      });
    }
  }

  /**
   * Set active (called by H5P.Wizard when changing tabs).
   */
  setActive() {
    this.mapEditor.show();
  }

  /**
   * Set map values.
   * @param {object[]} elements Element parameters.
   * @param {object[]} paths Path parameters.
   */
  setMapValues(elements, paths) {
    if (!elements && !paths) {
      return;
    }

    if (elements) {
      this.params.elements = elements;
    }

    if (paths) {
      this.params.paths = paths;
    }

    this.setValue(this.field, this.params);
  }

  /**
   * Build DOM.
   * @returns {HTMLElement} DOM for this class.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5peditor-game-map');

    return dom;
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$container.appendTo($wrapper);
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return true;
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.remove();
  }

  /**
   * Fill Dictionary.
   */
  fillDictionary() {
    // Convert H5PEditor language strings into object.
    const plainTranslations =
      H5PEditor.language['H5PEditor.GameMap'].libraryStrings || {};
    const translations = {};

    for (const key in plainTranslations) {
      let current = translations;
      // Assume string keys separated by . or / for defining path
      const splits = key.split(/[./]+/);
      const lastSplit = splits.pop();

      // Create nested object structure if necessary
      splits.forEach((split) => {
        if (!current[split]) {
          current[split] = {};
        }
        current = current[split];
      });

      // Add translation string
      current[lastSplit] = plainTranslations[key];
    }

    this.dictionary.fill(translations);
  }

  /**
   * Update custom CSS property.
   * @param {string} key Key.
   * @param {string} value Value.
   */
  updateCSSProperty(key, value) {
    this.dom.style.setProperty(`--editor-fields${key}`, value);
    this.mapEditor.updatePaths();
  }

  /**
   * Add change listeners for Color selectors.
   * Updates custom CSS property values.
   * @param {object} field H5P editor field.
   * @param {string} path Path and name for variable
   */
  addVisualsChangeListeners(field, path = '') {
    if (!field) {
      return;
    }

    const prefix = path.replace(/\//g, '-');
    if (field instanceof H5PEditor.ColorSelector) {
      field.changes.push(() => {
        this.updateCSSProperty(prefix, field.params);
        this.updateCSSProperty(
          `${prefix}-text`,
          Util.getTextContrastColor(field.params)
        );
      });

      this.updateCSSProperty(prefix, field.params);
      this.updateCSSProperty(
        `${prefix}-text`,
        Util.getTextContrastColor(field.params)
      );
    }
    else if (
      field instanceof H5PEditor.Select) {
      if (
        field.field.name === 'pathStyle' ||
        field.field.name === 'pathWidth'
      ) {
        field.changes.push(() => {
          this.updateCSSProperty(prefix, field.value);
        });

        this.updateCSSProperty(prefix, field.value);
      }
    }
    else if (field.children) {
      (field.children || []).forEach((child) => {
        this.addVisualsChangeListeners(
          child, `${path}/${child.field.name}`
        );
      });
    }
    else if (field instanceof H5PEditor.List) {
      field.forEachChild((listItem) => {
        this.addVisualsChangeListeners(
          listItem, `${path}/${listItem.field.name}`
        );
      });
    }
    else {
      // Field is not interesting
    }
  }
}
