export default class GameMapStageSelect {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM, H5P core requires this.$container and jQuery
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-game-map-stage-select'
    });

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, this.setValue);
    this.fieldInstance.appendTo(this.$container);

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');
  }

  /**
   * Set dynamic options.
   * @param {object} options Options to set.
   */
  setOptions(options) {
    const previouslySelectedValue = (select.value === '-') ? this.fieldInstance.value : select.value;

    const select = this.fieldInstance.$select.get(0);
    select.innerHTML = '';

    for (const key in options) {
      const option = options[key];

      const optionElement = document.createElement('option');
      optionElement.value = option.id;
      optionElement.textContent = option.label;

      if (previouslySelectedValue === option.id) {
        optionElement.selected = true;
      }
      select.appendChild(optionElement);
    }

    // Ensure that H5P core stores the current value.
    select.dispatchEvent(new Event('change'));
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    $wrapper.get(0).append(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.get(0).remove();
  }
}
