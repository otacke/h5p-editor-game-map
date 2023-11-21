import Util from '@services/util';

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

    const fromXPx = parseFloat(params.from.x) / 100 * mapSize.width;
    const fromYPx = parseFloat(params.from.y) / 100 * mapSize.height;
    const toXPx = parseFloat(params.to.x) / 100 * mapSize.width;
    const toYPx = parseFloat(params.to.y) / 100 * mapSize.height;
    const widthPx = parseFloat(params.from.width) / 100 * mapSize.width;
    const heightPx = parseFloat(params.from.height) / 100 * mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    // Angle in radians
    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    // Distance from center to border
    const offsetToBorder = {
      x: widthPx / 2 * Math.cos(angle) * 100 / mapSize.width,
      y: heightPx / 2 * Math.sin(angle) * 100 / mapSize.height
    };

    // Border width
    const targetPathWidth = parseFloat(
      this.params.globals.get('getStylePropertyValue')(
        '--editor-fields-visual-paths-style-pathWidth'
      )
    );
    const width = Math.min(
      Math.max(1, widthPx * targetPathWidth), widthPx * 0.3
    );

    const offsetPathStroke = width / 2 * 100 / mapSize.height;

    // Position + offset for centering + offset for border (+ stroke offset)
    const x = parseFloat(params.from.x) +
      parseFloat(params.from.width) / 2 +
      offsetToBorder.x;

    const y = parseFloat(params.from.y) +
      parseFloat(params.from.height) / 2 +
      offsetToBorder.y -
      offsetPathStroke;

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
}
