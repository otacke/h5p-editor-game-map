import Util from '@services/util.js';
import Path from '@components/map-editor/map-elements/path.js';

export default class Paths {
  /**
   * Paths model.
   * @class
   * @param {object} [params] Parameters.
   * @param {Map} params.map Map to draw on.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      paths: [],
    }, params);

    this.paths = {};

    this.params.paths.forEach((path) => {
      this.addPath(path);
    });

    this.callbacks = Util.extend({
      onPathClicked: () => {},
    }, callbacks);
  }

  /**
   * Get path.
   * @param {string|number} from Start stage.
   * @param {string|number} to Target stage.
   * @returns {Path|undefined} Path.
   */
  getPath(from, to) {
    return this.paths[from]?.[to];
  }

  /**
   * Add path.
   * @param {object} params Parameters.
   * @returns {Path} Path that was added or existed.
   */
  addPath(params = {}) {
    const oldPath = this.getPath(params.from, params.to);
    if (oldPath) {
      return oldPath; // Path already exists.
    }

    this.paths[params.from] = this.paths[params.from] || {};
    const path = new Path(
      {
        pathsGroupTemplate: this.params.pathsGroupTemplate,
        pathFields: this.params.pathFields,
        pathParams: params,
        globals: this.params.globals,
        dictionary: this.params.dictionary,
      },
      {
        onClicked: (params) => {
          this.callbacks.onPathClicked(params);
        }
      }
    );

    this.paths[params.from][params.to] = path;
    this.params.map.addPath(path.getDOM());

    return path;
  }

  /**
   * Remove path.
   * @param {object} params Parameters.
   * @param {string|number} params.from Start stage for path to be removed.
   * @param {string|number} params.to Target stage for path to be removed.
   */
  removePath(params = {}) {
    const path = this.getPath(params.from, params.to);

    if (path) {
      path.remove(); // Remove dom from map
      delete this.paths[params.from][params.to];
    }

    if (!Object.keys(this.paths[params.from]).length) {
      delete this.paths[params.from];
    }
  }

  /**
   * Update all existing paths.
   * @param {object} [params] Parameters.
   * @param {string|number} params.from Start stage for path.
   * @param {string|number} params.to Target stage for path.
   * @param {object|null} params.pathTelemetry Telemetry data for path.
   */
  updatePath(params = {}) {
    const from = (typeof params.from === 'number') ? params.from : parseInt(params.from);
    const to = (typeof params.to === 'number') ? params.to : parseInt(params.to);

    // Add path if not already present
    const path = this.addPath({ from: from, to: to });

    path.updateParams({
      from: params.from,
      to: params.to,
      colorPath: params.colorPath,
      pathWidth: params.pathWidth,
      pathStyle: params.pathStyle,
    });

    path.updateTelemetry(params.pathTelemetry);
  }

  /**
   * Update all existing paths.
   * @param {object} [params] Parameters.
   * @param {object[]} params.paths Path parameters.
   */
  update(params = {}) {
    // Add/update existing paths
    params.paths.forEach((path) => {
      this.updatePath(path);
    });

    // Delete obsolete paths
    for (const from in this.paths) {
      for (const to in this.paths[from]) {
        const isRequired = params.paths.some((path) => {
          return (
            path.from === parseInt(from) && path.to === parseInt(to) ||
            path.to === parseInt(from) && path.from === parseInt(to)
          );
        });

        if (!isRequired) {
          this.removePath({ from: from, to: to });
        }
      }
    }
  }

  /**
   * Get paths parameters.
   * @returns {object[]} Paths parameters.
   */
  getPathsParams() {
    return Object.values(this.paths).flatMap((fromPaths) =>
      Object.values(fromPaths).map((path) => path.getParams())
    );
  }
}
