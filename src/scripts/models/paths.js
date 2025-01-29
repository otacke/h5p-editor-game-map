import Util from '@services/util.js';
import Path from '@components/map-editor/map-elements/path.js';

/*
 * TODO: The parameter structure here and in path.js needs to be cleaned up.
 * It works, but got messy after adding "real" path elements to the map.
 * For instance, instead of indexing by from/to, a simple array and a lookup function should suffice.
 */
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
      this.addPath(
        {
          pathParams: {
            customVisuals: path.customVisuals,
            visualsType: path.visualsType,
          },
          from: path.from,
          to: path.to,
        }
      );

      this.paths[path.from][path.to].updateParams({
        from: path.from,
        to: path.to,
        customVisuals: path.customVisuals
      });
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
   */
  addPath(params = {}) {
    if (this.paths[params.from] && this.paths[params.from][params.to]) {
      return; // Path already exists.
    }

    this.paths[params.from] = this.paths[params.from] || {};
    const path = new Path(
      {
        pathsGroupTemplate: this.params.pathsGroupTemplate,
        pathFields: this.params.pathFields,
        pathParams: { ...params.pathParams, from: params.from, to: params.to },
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
  }

  /**
   * Remove path.
   * @param {object} params Parameters.
   * @param {string|number} params.from Start stage for path to be removed.
   * @param {string|number} params.to Target stage for path to be removed.
   */
  removePath(params = {}) {
    if (this.paths[params.from] && this.paths[params.from][params.to]) {
      this.paths[params.from][params.to].remove(); // Remove dom from map
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
    this.addPath({ from: from, to: to });

    this.paths[from][to].updateParams({
      from: params.from,
      to: params.to,
      colorPath: params.colorPath,
      pathWidth: params.pathWidth,
      pathStyle: params.pathStyle,
    });

    this.paths[from][to].updateTelemetry(params.pathTelemetry);
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
