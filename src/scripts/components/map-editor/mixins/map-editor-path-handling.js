import Util from '@services/util.js';

/** @constant {number} BORDER_WIDTH_FACTOR Factor for border width. */
const BORDER_WIDTH_FACTOR = 0.3;

/**
 * Mixin containing methods for path handling.
 */
export default class PathHandling {
  /**
   * Compute path telemetry.
   * @param {object} [params] Parameters.
   * @param {object} [params.from] Parameters for start stage.
   * @param {number} [params.from.x] X position of start stage in %.
   * @param {number} [params.from.y] Y position of start stage in %.
   * @param {number} [params.from.width] Width of start stage in px.
   * @param {number} [params.from.height] Height of start stage in px.
   * @param {object} [params.to] Parameters for target stage.
   * @param {number} [params.to.x] X position of target stage in %.
   * @param {number} [params.to.y] Y position of target stage in %.
   * @param {number} [params.to.width] Width of target stage in px.
   * @param {number} [params.to.height] Height of target stage in px.
   * @returns {object} Telemetry date for an path
   */
  computePathTelemetry(params = {}) {
    const mapSize = this.map.getSize();
    if (mapSize.height === 0 || mapSize.width === 0) {
      return null;
    }

    // eslint-disable-next-line no-magic-numbers
    const fromXPx = parseFloat(params.from.x) / 100 * mapSize.width;
    // eslint-disable-next-line no-magic-numbers
    const fromYPx = parseFloat(params.from.y) / 100 * mapSize.height;
    // eslint-disable-next-line no-magic-numbers
    const toXPx = parseFloat(params.to.x) / 100 * mapSize.width;
    // eslint-disable-next-line no-magic-numbers
    const toYPx = parseFloat(params.to.y) / 100 * mapSize.height;
    // eslint-disable-next-line no-magic-numbers
    const widthPx = parseFloat(params.from.width) / 100 * mapSize.width;
    // eslint-disable-next-line no-magic-numbers
    const heightPx = parseFloat(params.from.height) / 100 * mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    // Angle in radians
    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    // Distance from center to border
    const offsetToBorder = {
      // eslint-disable-next-line no-magic-numbers
      x: widthPx / 2 * Math.cos(angle) * 100 / mapSize.width,
      // eslint-disable-next-line no-magic-numbers
      y: heightPx / 2 * Math.sin(angle) * 100 / mapSize.height
    };

    // Border width
    params.targetPathWidth = params.targetPathWidth ?? parseFloat(
      this.params.globals.get('getStylePropertyValue')(
        '--editor-fields-visual-paths-style-pathWidth'
      )
    );
    const width = Math.min(
      Math.max(1, widthPx * params.targetPathWidth), widthPx * BORDER_WIDTH_FACTOR
    );

    // eslint-disable-next-line no-magic-numbers
    const offsetPathStroke = width / 2 * 100 / mapSize.height;

    // Position + offset for centering + offset for border (+ stroke offset)
    const x = parseFloat(params.from.x) +
    // eslint-disable-next-line no-magic-numbers
      parseFloat(params.from.width) / 2 + offsetToBorder.x;

    const y = parseFloat(params.from.y) +
      // eslint-disable-next-line no-magic-numbers
      parseFloat(params.from.height) / 2 + offsetToBorder.y - offsetPathStroke;

    // Good old Pythagoras, length in px
    const length = Math.sqrt(
      Math.abs(deltaXPx) * Math.abs(deltaXPx) +
      Math.abs(deltaYPx) * Math.abs(deltaYPx)
    ) - widthPx; // assuming circle for stage hotspot

    return { x, y, length, angle, width };
  }

  /**
   * Get height of paths. Supports px only for now.
   * @returns {number} Height in px.
   */
  getPathsHeight() {
    const height = Util.parseCSSLengthProperty(this.paths.getHeight());
    if (!height) {
      return 1;
    }

    if (height.unit === 'px') {
      return height.value;
    }

    return 1; // Fallback
  }

  /**
   * Handle path clicked.
   * @param {object} params Parameters.
   */
  handlePathClicked(params) {
    this.toolbar.hide();
    this.map.hide();

    this.dialog.showForm({
      form: params.form,
      doneCallback: () => {
        const isValid = params.children.every((child) => child.validate() ?? true);

        if (isValid) {
          this.toolbar.show();
          this.map.show();
          this.updatePaths();

          this.params.paths = this.paths.getPathsParams();
          this.callbacks.onChanged(null, this.params.paths);
        }

        return isValid;
      },
      removeCallback: () => {
        this.toolbar.show();
        this.map.show();
      }
    });

    setTimeout(() => {
      this.toolbar.blurAll();
    }, 0);
  };
}
