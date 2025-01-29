import UtilH5P from '@services/util-h5p.js';

/**
 * Mixin containing methods parent ready initialization.
 */
export default class ParentReadyInitialization {
  /**
   * Handle parent ready.
   */
  handleParentReady() {
    this.passReadies = false;

    this.initializeColors();
    this.initializeBackgroundImage();
    this.initializeHidePathColorOnFreeRoaming();
    this.initializeHidePathOptions();
  }

  /**
   * Initialize colors.
   */
  initializeColors() {
    const style = document.createElement('style');

    if (style.styleSheet) {
      style.styleSheet.cssText = '.h5peditor-game-map{}';
    }
    else {
      style.appendChild(document.createTextNode('.h5peditor-game-map{}'));
    }
    document.head.appendChild(style);

    this.addVisualsChangeListeners(UtilH5P.getRootField(this));
  }

  /**
   * Initialize background image.
   */
  initializeBackgroundImage() {
    this.backgroundImageField = H5PEditor.findField(
      'backgroundImageSettings/backgroundImage', this.parent
    );

    if (!this.backgroundImageField) {
      throw H5PEditor.t(
        'core', 'unknownFieldPath', { ':path': this.backgroundImageField }
      );
    }

    const backgroundImage = (this.backgroundImageField?.params?.path) ?
      H5P.getPath(this.backgroundImageField.params.path, H5PEditor.contentId) :
      null;

    this.mapEditor.setMapImage(backgroundImage);

    this.backgroundImageField.changes.push((change) => {
      const backgroundImage = (change?.path) ?
        H5P.getPath(change.path, H5PEditor.contentId) :
        null;

      this.mapEditor.setMapImage(backgroundImage);
    });
  }

  /**
   * Initialize roaming mode listener.
   */
  initializeHidePathColorOnFreeRoaming() {
    const roamingSelectField = H5PEditor.findField(
      'behaviour/map/roaming', this.parent.parent
    );

    const colorPathClearedField = H5PEditor.findField(
      'visual/paths/style/colorPathCleared', this.parent.parent
    );

    if (!roamingSelectField || !colorPathClearedField) {
      return; // Could not find fields
    }

    const toggleColorPathField = (roamingMode) => {
      colorPathClearedField.$item?.get(0).classList
        .toggle('display-none', roamingMode === 'free');
    };

    roamingSelectField.changes.push(() => {
      toggleColorPathField(roamingSelectField.$select.get(0).value);
    });
    toggleColorPathField(roamingSelectField.$select.get(0).value);
  }

  /**
   * Initialize path visibility listener.
   * Can't use showWhen as it breaks the editor.
   */
  initializeHidePathOptions() {
    const pathVisibilityField = H5PEditor.findField(
      'visual/paths/displayPaths', this.parent.parent
    );

    const pathOptionsField = H5PEditor.findField(
      'visual/paths/style', this.parent.parent
    );

    if (!pathVisibilityField || !pathOptionsField) {
      return; // Could not find fields
    }

    const togglePathOptionsField = (pathsAreVisible) => {
      pathOptionsField.$group?.get(0).classList
        .toggle('display-none', pathsAreVisible);
    };

    pathVisibilityField.changes.push(() => {
      togglePathOptionsField(!pathVisibilityField.$input.get(0).checked);
    });
    togglePathOptionsField(!pathVisibilityField.$input.get(0).checked);
  }
}
