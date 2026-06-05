/** @constant {number} NUMBER_OF_VERSION_SEGMENTS_DOWN_TO_PATCH_VERSION major (1) + (minor) 1 + (patch) 1 = 3. */
const NUMBER_OF_VERSION_SEGMENTS_DOWN_TO_PATCH_VERSION = 3;

/** @constant {string} H5P_CLI_INDICATOR_URL Heuristic to identify H5P CLI via H5PIntegration.url */
const H5P_CLI_INDICATOR_URL = 'http://localhost:8080';

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

    // Sort ascending so splicing from the back removes the right items
    // regardless of the order fieldNames were given in.
    removeIndexes.sort((a, b) => a - b);

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

  /**
   * Get score information for H5P content.
   * Might be "expensive" to create a runnable instance, but H5P does not allow to get the maxScore any other way.
   * @param {object} params H5P content parameters.
   * @param {number|string} contentId H5P content ID.
   * @returns {object} Score information, including whether it's a task, the score, and the max score.
   */
  static getScoreInfo(params = {}, contentId) {
    if (!params.library) {
      return { isTask: false, maxScore: 0 }; // Fallback
    }

    const instance = H5P.newRunnable(params, contentId, H5P.jQuery('<div></div>'), true);
    if (!instance) {
      return { isTask: false, score: 0, maxScore: 0 }; // Fallback
    }

    return {
      isTask: UtilH5P.isInstanceTask(instance),
      score: instance.getScore?.() ?? 0,
      maxScore: instance.getMaxScore?.() ?? 0,
    };
  }

  /**
   * Determine whether an H5P instance is a task.
   * @param {H5P.ContentType} instance Instance.
   * @returns {boolean} True, if instance is a task.
   */
  static isInstanceTask(instance = {}) {
    if (!instance) {
      return false;
    }

    if (typeof instance.isTask === 'boolean') {
      return instance.isTask; // Content will determine if it's task on its own
    }

    // Check for maxScore > 0 as indicator for being a task
    const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
    if (hasGetMaxScore && instance.getMaxScore() > 0) {
      return true;
    }

    return false;
  }
}

/**
 * Load H5P library (and dependency tree) at runtime.
 * @param {string} libraryName Library ubername, e.g. "H5P.Video 1.6".
 * @param {object} [options] Options.
 * @param {boolean} [options.preloadedDependencies] If true, also load preloadedDependencies from library.json.
 * @param {boolean} [options.optionalDependencies] If true, also load libraries referenced in semantics.json.
 * @param {boolean} [options.recursive] If true, also load the dependencies of dependencies.
 * @param {string[]} [options.ignore] URLs of files known to be unloadable; skipped without retrying.
 * @returns {Promise<string[]>} URLs that could not be loaded - pass back as options.ignore next time.
 */
export const loadH5PLibrary = async (libraryName, options = {}) => {
  const loadPreloadedDependencies = options.preloadedDependencies ?? true;
  const loadOptionalDependencies = options.optionalDependencies ?? false;
  const loadRecursively = options.recursive ?? true;

  // Files can potentially not be loaded, we keep track
  const unloadable = new Set(options.ignore ?? []);

  const queued = new Set(); // Folders already scheduled, to dedupe shared dependencies.
  const scripts = [];
  const styles = [];

  const loadJSON = async (url, missingHint) => {
    if (unloadable.has(url)) {
      return null; // Known to be unloadable; do not retry.
    }

    const { data, blocked } = await fetchJSON(url);
    if (!data) {
      unloadable.add(url);
      // A blocked request is most likely cross-origin (CORS); an HTTP miss is usually just absent.
      console.warn(blocked
        ? `Could not load ${url}. The request was blocked, possibly by a cross-origin (CORS) policy.`
        : `Could not load ${url}. ${missingHint}`);
    }

    return data;
  };

  /*
   * `descend` controls whether this library's own dependencies are resolved; it is true for the
   * requested library and, for its dependencies, only when loading recursively.
   */
  const resolve = async (uberName, descend) => {
    const machineName = uberName.split(' ')[0];
    const folderName = uberName.replace(' ', '-');

    if (queued.has(folderName)) {
      return; // already scheduled in this run
    }
    queued.add(folderName);

    const base = resolveLibraryBasePath(folderName);

    const library = await loadJSON(
      `${base}/library.json`,
      `That is fine if the content type ${uberName} is not installed.`,
    );
    if (!library) {
      return; // Library not installed / unreadable - nothing to load.
    }

    const versionCacheBuster = `?ver=${library.majorVersion}.${library.minorVersion}.${library.patchVersion}`;

    if (descend && loadPreloadedDependencies) {
      await runSequentially(library.preloadedDependencies ?? [], (dependency) => {
        const dependencyUberName = `${dependency.machineName} ${dependency.majorVersion}.${dependency.minorVersion}`;
        return resolve(dependencyUberName, loadRecursively);
      });
    }

    if (descend && loadOptionalDependencies) {
      const optionalDependencies = await extractOptionalDependencies(base, uberName, loadJSON);
      await runSequentially(optionalDependencies, (optionalDependency) => resolve(optionalDependency, loadRecursively));
    }

    if (typeof getConstructor(machineName) === 'function') {
      return; // library already loaded; only its dependencies (above) needed resolving
    }

    (library.preloadedCss ?? []).forEach((css) => styles.push(`${base}/${css.path}${versionCacheBuster}`));
    (library.preloadedJs ?? []).forEach((js) => scripts.push(`${base}/${js.path}${versionCacheBuster}`));
  };

  await resolve(libraryName, true);

  styles.forEach((href) => {
    appendStyleSheet(href);
  });

  await runSequentially(scripts, loadScript); // Loading in order guarantees dependencies come first.

  return Array.from(unloadable);
};

/**
 * Run async tasks one after another, preserving order.
 * @param {string[]} items Items to process, usually a URL or uberName.
 * @param {function} task Async task run for each item.
 * @returns {Promise} Resolves once every item has been processed in order.
 */
const runSequentially = (items, task) => {
  return items.reduce((chain, item) => chain.then(() => task(item)), Promise.resolve());
};

/**
 * Resolve a library's base path, working around HFP-4240 (H5P CLI builds an incorrect path).
 * @param {string} folder Library folder, e.g. "H5P.Video-1.6".
 * @returns {string} Library base path.
 */
const resolveLibraryBasePath = (folder) => {
  let base = H5P.getLibraryPath(folder);

  if (H5PIntegration.url === H5P_CLI_INDICATOR_URL) {
    const splits = base.split('-');
    const version = splits[splits.length - 1];
    const versionParts = version.split('.');
    if (versionParts.length === NUMBER_OF_VERSION_SEGMENTS_DOWN_TO_PATCH_VERSION) {
      base = base.split('.').slice(0, -1).join('.');
    }
  }

  return base;
};

/**
 * Add a stylesheet to the document.
 * @param {string} href Stylesheet URL.
 */
const appendStyleSheet = (href) => {
  if (H5P.cssLoaded(href)) {
    return; // Already loaded.
  }

  H5PIntegration.loadedCss.push(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
};

/**
 * Load script via H5P core (dedupes via H5P.jsLoaded).
 * @param {string} src Script URL.
 * @returns {Promise} Resolves once the script has loaded.
 */
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    H5PEditor.loadJs(src, (error) => error ? reject(error) : resolve());
  });
};

/**
 * Get constructor for an H5P library (if defined).
 * @param {string} machineName Content type's machine name, e.g. "H5P.Video".
 * @param {Window} [targetWindow] Target window if context is relevant.
 * @returns {function|undefined} Constructor function or undefined if not found in targetWindow.
 */
const getConstructor = (machineName, targetWindow = window) => {
  const constructor = machineName.split('.').reduce((namespace, part) => namespace?.[part], targetWindow);

  return typeof constructor === 'function' ? constructor : undefined;
};

/**
 * Fetch and parse a JSON file, distinguishing a blocked request from a plain miss.
 * @param {string} url URL to fetch.
 * @returns {Promise<{data: object|null, blocked: boolean}>} Parsed JSON in `data` (null on failure);
 *   `blocked` is true when fetch() threw, which on a different origin most likely means a CORS block.
 */
const fetchJSON = async (url) => {
  let response;
  try {
    response = await fetch(url);
  }
  catch {
    // fetch() itself threw: network failure or, on a different origin, a cross-origin (CORS) block.
    return { data: null, blocked: true };
  }

  if (!response.ok) {
    return { data: null, blocked: false }; // HTTP error, e.g. 404 because the file is not present.
  }

  try {
    return { data: await response.json() };
  }
  catch {
    return { data: null, blocked: false }; // Invalid JSON; treat as a plain miss.
  }
};

/**
 * Extract optional dependencies from semantics.json for a library.
 * @param {string} base Library base path from H5P.getLibraryPath().
 * @param {string} uberName Library ubername, e.g. "H5P.Video 1.6". Used for logging.
 * @param {function} loadJSON Loader returning parsed JSON or null, used to fetch semantics.json.
 * @returns {Promise<string[]>} Optional dependency ubernames, e.g. ["H5P.Image 1.1"].
 */
const extractOptionalDependencies = async (base, uberName, loadJSON) => {
  const semantics = await loadJSON(`${base}/semantics.json`, `That is fine if ${uberName} has no semantics.`);
  if (!semantics) {
    return [];
  }

  const optionalDependencies = new Set();

  const traverse = (fields) => {
    if (!Array.isArray(fields)) {
      return;
    }

    fields.forEach((field) => {
      if (field.type === 'library' && Array.isArray(field.options)) {
        field.options.forEach((option) => {
          if (typeof option === 'string') {
            optionalDependencies.add(option);
          }
        });
      }
      else if (field.type === 'group' && Array.isArray(field.fields)) {
        traverse(field.fields);
      }
      else if (field.type === 'list' && field.field) {
        traverse([field.field]);
      }
    });
  };

  traverse(semantics);
  return Array.from(optionalDependencies);
};
