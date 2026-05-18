import Dictionary from '@services/dictionary.js';
import Util from '@services/util.js';
import UtilCSS from '@services/util-css.js';
import UtilH5P from '@services/util-h5p.js';
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
      GameMap, [ParentReadyInitialization],
    );

    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      elements: [],
      paths: [],
      mapOptions: {
        backgroundSettings: {
          backgroundColor: 'rgb(255, 255, 255)',
        },
      },
    }, params);
    this.setValue = setValue;

    this.dictionary = new Dictionary();
    this.fillDictionary();

    this.globals = new Map();
    this.globals.set('mainInstance', this);
    this.globals.set('getStylePropertyValue', (key) => {
      return this.dom.style.getPropertyValue(key);
    });
    this.globals.set('getAllGamemapsParams', () => {
      return this.gamemapsList?.getValue() ?? [];
    });

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.dom = this.buildDOM();
    this.$container = H5P.jQuery(this.dom);

    // Create template for elements group field
    const elementsGroup = this.field.fields.find((field) => field.name === 'elements').field;
    const elementsGroupTemplate = {
      type: elementsGroup.type,
      parent: this,
      field: elementsGroup,
      params: this.params.elements,
      setValue: (value) => {}, // No setValue needed
    };

    // Create template for paths group field
    const pathsGroup = this.field.fields.find((field) => field.name === 'paths').field;
    const pathsGroupTemplate = {
      type: pathsGroup.type,
      parent: this,
      field: pathsGroup,
      params: this.params.paths,
      setValue: (value) => {}, // No setValue needed
    };

    // Ensure that dynamically set stageScoreId select options are available to match saved params.
    const stageScoreIdOptions = this.params.elements.map((element) => ({ value: element.id, label: element.label }));
    const elementsFields = H5P.cloneObject(elementsGroup.fields, true);
    UtilH5P.overrideSemantics(
      elementsFields,
      { name: 'stageScoreId', type: 'select' },
      { options: stageScoreIdOptions },
    );

    // Map canvas
    this.mapEditor = new MapEditor(
      {
        backgroundColor: this.params.mapOptions.backgroundSettings.backgroundColor,
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
          this.mapEditor?.validateMapElements();
          this.setMapValues(elements, paths);
        },
        onFormOpened: () => {
          this.disableOtherGameMapInstances();
        },
        onFormClosed: () => {
          this.enableOtherGameMapInstances();
        },
        onUpdateOtherGamemaps: () => {
          this.saveOtherGameMapValues();
        },
      },
    );
    this.dom.appendChild(this.mapEditor.getDOM());


    const mapOptionsGroup = this.field.fields.find((field) => field.name === 'mapOptions');
    this.mapOptionsInstance = new H5PEditor.widgets[mapOptionsGroup.type](
      this,
      mapOptionsGroup,
      this.params.mapOptions,
      (value) => {}, // TOOD: NEEDED?
    );
    this.mapOptionsInstance.appendTo(this.dom);

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

    this.saveValues();
  }

  /*
   * Save values for H5P editor.
   */
  saveValues() {
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
   * Trigger other GameMap editor widget instances to save their values.
   * @param {object} [params] Parameters.
   * @param {number} [params.index] Index of map to save values for.
   */
  saveOtherGameMapValues(params = {}) {
    this.gamemapsList?.forEachChild((child, index) => {
      if (typeof params.index === 'number' && params.index !== index) {
        return;
      }

      if (child !== this) {
        child.saveValues();
      }
    });
  }

  /**
   * Enable other GameMap widget instances that are in the same list field.
   */
  enableOtherGameMapInstances() {
    this.gamemapsList?.forEachChild((child) => {
      if (child !== this) {
        child.enable();
      }
    });
  }

  /**
   * Enable.
   */
  enable() {
    this.dom.classList.remove('blocked');
  }

  /**
   * Disable other GameMap widget instances that are in the same list field.
   */
  disableOtherGameMapInstances() {
    this.gamemapsList?.forEachChild((child) => {
      if (child !== this) {
        child.disable();
      }
    });
  }

  /**
   * Disable.
   */
  disable() {
    this.dom.classList.add('blocked');
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.mapEditor.validate();
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

    const updateField = (value, textColor) => {
      this.updateCSSProperty(prefix, value);
      if (textColor) {
        this.updateCSSProperty(`${prefix}-text`, textColor);
      }
      this.mapEditor.updatePaths();
    };

    if (field instanceof H5PEditor.ColorSelector) {
      const updateColorSelector = () => {
        updateField(field.params, UtilCSS.getTextContrastColor(field.params));
      };

      field.changes.push(() => {
        updateColorSelector();
      });
      updateColorSelector();
    }
    else if (field instanceof H5PEditor.Select && ['pathStyle', 'pathWidth'].includes(field.field.name)) {
      const updateSelectField = () => {
        updateField(field.value);
      };

      field.changes.push(() => {
        updateSelectField();
      });
      updateSelectField();
    }
    else if (field.children) {
      field.children.forEach((child) => {
        this.addVisualsChangeListeners(child, `${path}/${child.field.name}`);
      });
    }
    else if (field instanceof H5PEditor.List) {
      field.forEachChild((listItem) => {
        this.addVisualsChangeListeners(listItem, `${path}/${listItem.field.name}`);
      });
    }
  }
}
