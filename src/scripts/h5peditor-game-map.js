import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Util from '@services/util';
import MapEditor from '@components/map-editor/map-editor';
import NoImage from '@components/no-image/no-image';
import ParentReadyInitialization from '@mixins/parent-ready-initialization';
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
      elements: []
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

    // No image source info
    this.noImage = new NoImage(
      {
        dictionary: this.dictionary
      },
      {
        onClick: () => {
          this.parent.$tabs[0].click();
        }
      }
    );
    this.dom.appendChild(this.noImage.getDOM());

    // Create instance for elements group field
    const elementsGroup = this.field.fields
      .find((field) => field.name === 'elements').field;
    const elementsFields = H5P.cloneObject(elementsGroup.fields, true);
    this.globals.set('elementsGroupField', new H5PEditor.widgets[elementsGroup.type](
      this, elementsGroup, this.params.elements, () => {} // No setValue needed
    ));

    // Map canvas
    this.mapEditor = new MapEditor(
      {
        dictionary: this.dictionary,
        globals: this.globals,
        elements: this.params.elements,
        elementsFields: elementsFields
      },
      {
        onChanged: (elements) => {
          this.setMapValues(elements);
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
    if (!this.passReadies) {
      ready();
      return;
    }

    this.parent.ready(ready);
  }

  /**
   * Set active (called by H5P.Wizard when changing tabs).
   */
  setActive() {
    if (!!this.backgroundImageField?.params) {
      this.noImage.hide();
      this.mapEditor.show();
    }
    else {
      this.mapEditor.hide();
      this.noImage.show();
    }
  }

  /**
   * Set map values.
   * @param {object[]} elements Element parameters of elements.
   */
  setMapValues(elements) {
    this.params.elements = elements;
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
