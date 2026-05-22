/** @constant {number} READSPEAKER_DELAY_MS Delay for readspeaker. */
const READSPEAKER_DELAY_MS = 100;

/**
 * Allow to read vie readspeaker.
 */
export default class Readspeaker {

  /**
   * Initialize.
   * @param {HTMLElement} wrapper Wrapper to append to.
   */
  static attach(wrapper) {
    if (!wrapper || Readspeaker.container) {
      return;
    }

    const read = document.createElement('div');
    read.style.height = '1px';
    read.style.overflow = 'hidden';
    read.style.position = 'absolute';
    read.style.textIndent = '1px';
    read.style.top = '-1px';
    read.style.width = '1px';

    read.setAttribute('aria-live', 'polite');
    wrapper.appendChild(read);

    Readspeaker.container = read;
  }

  /**
   * Force readspeaker to read text.
   * @param {string|string[]} texts Text(s) to read.
   */
  static read(texts) {
    if (!Readspeaker.container || typeof texts === 'undefined') {
      return;
    }

    if (typeof texts === 'string') {
      texts = [texts];
    }

    if (Readspeaker.textRead) {
      texts = [Readspeaker.textRead, ... texts];
    }

    // Remove . at end of strings to be read
    texts = texts.map((text) => {
      text = text.trim();
      return text.substring(text.length - 1) === '.' ?
        text.substring(0, text.length - 1) :
        text;
    });

    Readspeaker.textRead = `${texts.join('. ')}.`;
    Readspeaker.container.innerText = Readspeaker.textRead;

    setTimeout(() => {
      Readspeaker.textRead = null;
      Readspeaker.container.innerText = '';
    }, READSPEAKER_DELAY_MS);
  }
}

Readspeaker.container = null;
Readspeaker.textRead = null;
