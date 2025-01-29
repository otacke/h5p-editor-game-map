/** @constant {number} DOUBLE_CLICK_TIME_MS Double click time in ms. */
const DOUBLE_CLICK_TIME_MS = 300;

/** Class for utility functions */
export default class UtilDOM {
  /**
   * Double click handler.
   * @param {Event} event Regular click event.
   * @param {function} callback Function to execute on doubleClick.
   */
  static doubleClick(event, callback) {
    const DOUBLE_CLICK_COUNT = 2;

    if (!event || typeof callback !== 'function') {
      return;
    }

    if (isNaN(event.target.count)) {
      event.target.count = 1;
    }
    else {
      event.target.count++;
    }

    setTimeout(() => {
      if (event.target.count === DOUBLE_CLICK_COUNT) {
        callback();
      }
      event.target.count = 0;
    }, DOUBLE_CLICK_TIME_MS);
  }

  /**
   * Determine whether a device supports touch events
   * @returns {boolean} True, if device supports touch events, else false.
   */
  static supportsTouch() {
    return (
      ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
    );
  }
}
