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

  /**
   * Call callback function once dom element gets visible in viewport.
   * @async
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   * @param {object} [options] IntersectionObserver options.
   * @returns {IntersectionObserver} Promise for IntersectionObserver.
   */
  static async callOnceVisible(dom, callback, options = {}) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    options.threshold = options.threshold || 0;

    return await new Promise((resolve) => {
      // iOS is behind ... Again ...
      const idleCallback = window.requestIdleCallback ?
        window.requestIdleCallback :
        window.requestAnimationFrame;

      idleCallback(() => {
        // Get started once visible and ready
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(dom);
            observer.disconnect();

            callback();
          }
        }, {
          ...(options.root && { root: options.root }),
          threshold: options.threshold,
        });
        observer.observe(dom);

        resolve(observer);
      });
    });
  }
}
