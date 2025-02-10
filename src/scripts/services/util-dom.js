/** @constant {number} DOUBLE_CLICK_TIME_MS Double click time in ms. */
const DOUBLE_CLICK_TIME_MS = 300;

/** @constant {number} DOUBLE_CLICK_COUNT Number of clicks to trigger double click. */
const DOUBLE_CLICK_COUNT = 2;

const clickCounts = new WeakMap();

/** Class for utility functions */
export default class UtilDOM {
  /**
   * Double click handler.
   * @param {Event} event Regular click event.
   * @param {function} callback Function to execute on doubleClick.
   */
  static doubleClick(event, callback) {


    if (!event || typeof callback !== 'function') {
      return;
    }

    const count = clickCounts.get(event.target) || 0;
    clickCounts.set(event.target, count + 1);

    setTimeout(() => {
      if (clickCounts.get(event.target) === DOUBLE_CLICK_COUNT) {
        callback();
      }
      clickCounts.set(event.target, 0);
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
