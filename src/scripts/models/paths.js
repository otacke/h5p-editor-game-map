import Path from '@components/map-editor/path';

export default class Paths {

  constructor(params = {}) {
    this.params = params;
    this.paths = {};
  }

  /**
   * Get height of paths as CSS value.
   *
   * @returns {string} Defined height.
   */
  getHeight() {
    const somePath = Object.values(Object.values(this.paths)[0] || {})[0];

    if (!somePath) {
      return null; // No path set
    }

    return somePath.getHeight();
  }

  /**
   * Add path.
   *
   * @param {object} params Parameters.
   */
  addPath(params = {}) {
    if (this.paths[params.from] && this.paths[params.from][params.to]) {
      return; // Path already exists.
    }

    this.paths[params.from] = this.paths[params.from] || {};
    const path = new Path();

    this.paths[params.from][params.to] = path;
    this.params.map.addPath(path.getDOM());
  }

  /**
   * Remove path.
   *
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
   *
   * @param {object} [params={}] Parameters.
   * @param {string|number} params.from Start stage for path.
   * @param {string|number} params.to Target stage for path.
   * @param {object|null} params.pathTelemetry Telemetry data for path.
   */
  updatePath(params = {}) {
    if (params.pathTelemetry === null) {
      return; // Nothing to update here
    }

    const from = (typeof params.from === 'number') ?
      params.from :
      parseInt(params.from);

    const to = (typeof params.to === 'number') ?
      params.to :
      parseInt(params.to);

    // Add path if not already present
    this.addPath({ from: from, to: to });

    this.paths[from][to].update(params.pathTelemetry);
  }

  /**
   * Update all existing paths.
   *
   * @param {object} [params={}] Parameters.
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
}
