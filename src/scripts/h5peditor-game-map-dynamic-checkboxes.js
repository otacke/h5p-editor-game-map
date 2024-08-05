import './h5peditor-game-map-dynamic-checkboxes.scss';

/**
 * Class for H5P widget for dynamic value checkboxes
 * Displays a list of checkboxes, and the list is regenerated each time the
 * field is set as active unlike H5PEditor.select where the options are
 * generated when the field is initialized, and after that stays the same.
 * Other fields may change the options in dynamicCheckboxes
 */
export default class GameMapDynamicCheckboxes {
  /**
   * Initialize widget.
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.parent = parent;

    this.field = field;
    this.field.options = this.field.options ?? [];

    this.params = params || [];

    this.setValue = setValue;

    this.callbacks = {
      onNeighborsChanged: () => {}
    };

    this.checkboxes = [];

    this.$item = H5P.jQuery(H5PEditor.createFieldMarkup(this.field));
    this.$errors = H5P.jQuery(this.$item.children('.h5p-errors'));

    this.setValue(this.field, this.params);
  }

  /**
   * Append widget to form.
   * @param {H5P.jQuery} $wrapper Wrapper to append to.
   */
  appendTo($wrapper) {
    $wrapper.append(this.$item);
  }

  /**
   * Set dictionary.
   * @param {object} dictionary Dictionary.
   */
  setDictionary(dictionary) {
    this.dictionary = dictionary;
  }

  /**
   * Build list HTML.
   * @param {object} [params] Parameters.
   * @param {string} [params.ignore] Id to ignore when displaying list.
   * @returns {HTMLElement} HTML List element.
   */
  buildListHTML(params = {}) {
    const list = document.createElement('ul');
    list.classList.add('h5p-gamemap-editor-neighbors-list');

    this.field.options.forEach((option) => {
      if (params.ignore === option.value) {
        return;
      }
      const listItem = document.createElement('li');

      const label = document.createElement('label');
      label.classList.add('h5p-editor-label');

      const input = document.createElement('input');
      input.setAttribute('type', 'checkbox');
      input.checked = this.params.includes(option.value);
      input.value = option.value;
      input.addEventListener('change', () => {
        this.change(input);
        this.updateValues();
      });
      this.checkboxes.push(input);
      label.appendChild(input);

      const labelText = document.createElement('div');
      labelText.classList.add('h5p-label-text');
      labelText.innerText = option.label;
      label.appendChild(labelText);

      listItem.appendChild(label);
      list.appendChild(listItem);
    });

    return list;
  }

  /**
   * Set widget active and (re)generate options.
   * @param {object} [params] Parameters.
   * @param {string} params.id Current id value.
   * @param {function} params.onNeighborsChanged Callback when neighbors changed.
   */
  setActive(params = {}) {
    const MIN_OPTIONS = 2;
    this.currentId = params.id;
    this.params = params.neighbors;
    this.callbacks.onNeighborsChanged = params.onNeighborsChanged;

    const list = this.$item.get(0);
    list.innerHTML = '';

    const label = document.createElement('div');
    label.classList.add('h5peditor-label');
    label.innerText = this.field.label;
    list.appendChild(label);

    if (this.field.options.length < MIN_OPTIONS) {
      const message = document.createElement('div');
      message.classList.add('h5p-gamemap-editor-no-neighbors');
      message.classList.add('h5peditor-field-description');
      message.innerText = this.dictionary?.get('l10n.noNeighbors') || '';
      list.appendChild(message);
      return;
    }

    this.checkboxes = [];

    const neighbors = document.createElement('div');
    neighbors.classList.add('h5p-gamemap-editor-neighbors');
    neighbors.appendChild(this.buildListHTML({ ignore: this.currentId }));

    list.appendChild(neighbors);

    this.updateValues();
  }

  /**
   * Update values.
   */
  updateValues() {
    this.setValue(this.field, this.params);
    this.callbacks.onNeighborsChanged(this.currentId, this.params);
  }

  /**
   * Update params with changes to checkbox.
   * @param {HTMLInputElement} input Input field.
   */
  change(input) {
    const value = input.value;

    if (input.checked) {
      this.params.push(value);
    }
    else {
      this.params.forEach((param, index) => {
        if (param === value) {
          this.params.splice(index, 1);
        }
      });
    }
  }

  /**
   * Validate the current field.
   * @returns {boolean} True.
   */
  validate() {
    return true;
  }

  /**
   * Remove.
   */
  remove() {
    this.item.remove();
  }
}
