import Dictionary from '@services/dictionary.js';
import Util from '@services/util.js';
import UtilCSS from '@services/util-css.js';
import UtilH5P, { loadH5PLibrary } from '@services/util-h5p.js';
import MapEditor from '@components/map-editor/map-editor.js';
import ParentReadyInitialization from '@mixins/parent-ready-initialization.js';
import PreviewOverlay from '@components/preview/preview-overlay.js';
import Readspeaker from '@services/readspeaker.js';

import './h5peditor-game-map.scss';

let sharedObserver = null;
const domInstanceMap = new Map();

/** @constant {number} CONTENTS_GROUP_COLLAPSE_THRESHOLD_PX Width below which vertical tabs collapse. */
const CONTENTS_GROUP_COLLAPSE_THRESHOLD_PX = 480;

/** Class for Boilerplate H5P widget */
export default class GameMap extends H5P.EventDispatcher {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    super();

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

    this.unloadableH5PFiles = [];

    this.globals = new Map();
    this.globals.set('mainInstance', this);
    this.globals.set('getStylePropertyValue', (key) => {
      return this.dom.style.getPropertyValue(key);
    });
    this.globals.set('getAllGamemapsParams', () => {
      return this.gamemapsList?.getValue() ?? [];
    });
    this.globals.set('resize', () => {
      this.trigger('resize');
    });
    this.globals.set('getUnloadableH5PFiles', () => [...this.unloadableH5PFiles]);
    this.globals.set('addUnloadableH5PFiles', (files) => {
      const set = new Set(this.unloadableH5PFiles);
      files.forEach((file) => set.add(file));
      this.unloadableH5PFiles = [...set];
    });

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.dom = this.buildDOM();
    this.$container = H5P.jQuery(this.dom);

    Readspeaker.attach(this.dom);

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
          this.setMapValues(elements, paths);
        },
        onFormOpened: () => {
          this.ensureFormHasRealEstate();
          this.disableOtherGameMapInstances();
        },
        onFormClosed: () => {
          this.stopObservingFormWidth();
          this.validateAllMapsElements();
          this.enableOtherGameMapInstances();
        },
        onUpdateOtherGamemaps: () => {
          this.saveOtherGameMapValues();
        },
        onTogglePreview: () => {
          this.openPreview();
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

    // Preview overlay
    this.previewOverlay = new PreviewOverlay(
      {
        dictionary: this.dictionary,
        globals: this.globals,
      },
      {
        onDone: () => {
          this.closePreview();
        },
      },
    );
    this.dom.append(this.previewOverlay.getDOM());

    this.handleWindowResize = () => {
      this.mapEditor.resize();
      this.previewOverlay.resize();
    };
    window.addEventListener('resize', this.handleWindowResize);

    this.parent.ready(() => {
      this.handleParentReady();
    });

    GameMap.observeDOM(this);
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
    this.saveOtherGameMapValues();
  }

  /*
   * Save values for H5P editor.
   */
  saveValues() {
    this.setValue(this.field, this.params);
  }

  /**
   * Ensure the dialog form has enough horizontal real estate.
   * Using VerticalTabs widgets uses lots of space, but they make sense here.
   */
  ensureFormHasRealEstate() {
    this.stopObservingFormWidth();

    const contentsGroup = this.dom.querySelector('.field-name-contentsGroup');
    if (!contentsGroup) {
      return;
    }

    // Collect ancestor VerticalTabs widget DOMs — the widget itself does not expose methods to interact with :-/
    const ancestorVtabs = [];
    let wrapper = contentsGroup.parentNode?.closest('.h5p-vtab-wrapper');
    while (wrapper) {
      const vtabs = wrapper.querySelector('.h5p-vtabs');
      if (vtabs) {
        ancestorVtabs.push(vtabs);
      }

      wrapper = wrapper.parentNode?.closest('.h5p-vtab-wrapper');
    }

    if (!ancestorVtabs.length) {
      return; // No VerticalTabs
    }

    const collapseVtabsIfFormNarrow = () => {
      for (const vtabs of ancestorVtabs) {
        const width = contentsGroup.getBoundingClientRect().width;
        if (width >= CONTENTS_GROUP_COLLAPSE_THRESHOLD_PX) {
          return; // Form has "enough" space.
        }

        if (!vtabs.classList.contains('is-collapsed')) {
          vtabs.querySelector('.h5p-vtabs-expand-collapse')?.click();
        }
      }
    };

    this.contentsGroupObserver = new ResizeObserver(collapseVtabsIfFormNarrow);
    this.contentsGroupObserver.observe(contentsGroup);
  }

  /**
   * Stop observing the form's contentsGroup.
   */
  stopObservingFormWidth() {
    this.contentsGroupObserver?.disconnect();
    this.contentsGroupObserver = null;
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
    this.gamemapsList?.forEachChild((gamemap) => {
      if (gamemap !== this) {
        gamemap.enable();
      }
    });
  }

  /**
   * Validate map elements of all game maps.
   */
  validateAllMapsElements() {
    this.gamemapsList?.forEachChild((gamemap) => {
      gamemap.validateMapElements();
    });
  }

  /**
   * Validate map elements.
   */
  validateMapElements() {
    this.mapEditor?.validateMapElements();
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
    window.removeEventListener('resize', this.handleWindowResize);
    if (this.previewInstance) {
      this.closePreview();
    }
    GameMap.unobserveDOM(this);
    this.$container.remove();
  }

  /**
   * Handle this.dom becoming visible.
   */
  handleDOMVisible() {
    this.mapEditor.validateMapElements();
    this.mapEditor.resize();
  }

  /**
   * Register an instance with the shared IntersectionObserver.
   * @param {GameMap} instance Instance to observe.
   */
  static observeDOM(instance) {
    if (!sharedObserver) {
      sharedObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            domInstanceMap.get(entry.target)?.handleDOMVisible();
          }
        }
      });
    }

    domInstanceMap.set(instance.dom, instance);
    sharedObserver.observe(instance.dom);
  }

  /**
   * Unregister an instance from the shared IntersectionObserver.
   * @param {GameMap} instance Instance to stop observing.
   */
  static unobserveDOM(instance) {
    sharedObserver?.unobserve(instance.dom);
    domInstanceMap.delete(instance.dom);
    if (domInstanceMap.size === 0) {
      sharedObserver?.disconnect();
      sharedObserver = null;
    }
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

  /**
   * Open preview.
   * @returns {Promise<void>} Resolves once the preview is open.
   */
  async openPreview() {
    // Snapshot known H5PIntegration content ids so we can drop the ones the
    // preview instance creates without touching the ones the surrounding
    // editor relies on.
    this.previewKnownContentIds = new Set(
      Object.keys(window.H5PIntegration?.contents ?? {}),
    );

    // Loading message as placeholder for when libraries still need loading.
    this.previewOverlay.show();
    this.previewOverlay.showLoading();
    this.mapEditor.toggleVisibility(false);

    Readspeaker.read(this.dictionary.get('a11y.previewOpened'));

    await this.createPreviewInstance();

    if (!this.previewOverlay.isVisible) {
      return; // Preview may have been closed again while instance was loading.
    }

    if (!this.previewInstance) {
      this.closePreview();
      return;
    }

    this.previewOverlay.attachInstance(this.previewInstance);
  }

  /**
   * Close preview.
   */
  closePreview() {
    this.mapEditor.toggleVisibility(true);
    this.previewOverlay.detachInstance();
    this.previewInstance = null;

    const contents = window.H5PIntegration?.contents;
    if (contents && this.previewKnownContentIds) {
      for (const cid of Object.keys(contents)) {
        if (!this.previewKnownContentIds.has(cid)) {
          delete contents[cid];
        }
      }
    }
    this.previewKnownContentIds = null;

    this.previewOverlay.decloak();
    this.previewOverlay.hide();
    this.enableOtherGameMapInstances();

    Readspeaker.read(this.dictionary.get('a11y.previewClosed'));
  }

  /**
   * Create preview instance.
   * @returns {Promise<void>} Resolves once all soft dependencies have loaded.
   */
  async createPreviewInstance() {
    const previewParams = this.buildPreviewParams();
    /*
     * The GameMap view needs libraries to be installed in order to work.
     * You would normally add required dependencies to subcontent libraries in library.json. However, that would make
     * installing them mandatory to use GameMap. That's not an option (on H5P.com), where some of the optional
     * dependencies are not available. Hence, we're here using our own dynamic H5P library loading mechanism.
     */
    const subcontentUberNames = GameMap.extractSubcontentUberNames(previewParams);

    /*
     * Client-side, we can't determine if file exists (e.g. semantics.json in H5P.Components) and don't want to try
     * loading them each time we create the preview.
     */
    const unloadableH5PFiles = new Set(this.unloadableH5PFiles);
    const ignore = [...unloadableH5PFiles];
    const results = await Promise.all(subcontentUberNames.map((library) => {
      return loadH5PLibrary(library, { optionalDependencies: true, ignore });
    }));
    results.flat().forEach((file) => {
      unloadableH5PFiles.add(file);
    });
    this.unloadableH5PFiles = [...unloadableH5PFiles];

    const libraryUberName = Object.keys(H5PEditor.libraryLoaded)
      .find((library) => library.split(' ')[0] === 'H5P.GameMap');

    const contentId = H5PEditor.contentId;
    this.previewInstance = H5P.newRunnable(
      {
        library: libraryUberName,
        params: previewParams,
      },
      contentId,
      undefined,
      undefined,
      { metadata: { title: this.contentTitle } },
    );
  }

  /**
   * Build parameters for preview instance based on current parameters.
   * @returns {object} Parameters for preview instance.
   */
  buildPreviewParams() {
    let form = this.parent;
    while (form?.parent) {
      form = form.parent;
    }

    const previewParams = {
      ...JSON.parse(JSON.stringify(form.params)),
      isPreview: true,
    };

    return previewParams;
  }

  /**
   * Collect the unique ubernames of all content types embedded in the maps, e.g. "H5P.AdvancedText 1.1".
   * @param {object} previewParams Preview parameters as built by buildPreviewParams().
   * @returns {string[]} Unique subcontent library ubernames.
   */
  static extractSubcontentUberNames(previewParams) {
    return [...(previewParams.gamemaps ?? []).reduce((libraries, gamemap) => {
      (gamemap.elements ?? []).forEach((element) => {
        (element.contentsList ?? []).forEach((content) => {
          const library = content.contentType?.library;
          if (library) {
            libraries.add(library);
          }
        });
      });

      return libraries;
    }, new Set())];
  }
}
