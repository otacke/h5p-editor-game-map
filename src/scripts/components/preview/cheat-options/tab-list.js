import './tab-list.scss';

export default class TabList {
  /**
   * Follows {@link https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ Tabs Pattern}.
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-gamemap-cheat-options-tab-list-container');

    this.currentTabIndex = 0;
    this.handleTabListKeyDown = this.handleTabListKeyDown.bind(this);
    this.handleTabListClick = this.handleTabListClick.bind(this);

    this.tabList = document.createElement('div');
    this.tabList.classList.add('h5p-editor-gamemap-cheat-options-tab-list');
    this.tabList.setAttribute('role', 'tablist');
    this.tabList.setAttribute('aria-label', this.params.dictionary.get('l10n.cheatOptionTypes'));
    this.tabList.addEventListener('keydown', this.handleTabListKeyDown);
    this.tabList.addEventListener('click', this.handleTabListClick);

    this.dom.append(this.tabList);

    const doms = (this.params.tabs ?? []).map((tab) => {
      const tabId = H5P.createUUID();
      const tabPanelId = H5P.createUUID();

      const tabButton = this.buildTab({
        tabId,
        tabPanelId,
        label: tab.label,
      });

      const tabPanel = this.buildTabPanel({
        tabId,
        tabPanelId,
        content: tab.contentClass.getDOM(),
      });

      return { tabButton, tabPanel };
    });

    this.tabs = doms.map((dom) => dom.tabButton);
    this.tabs.forEach((tab) => this.tabList.append(tab));

    this.tabPanels = doms.map((dom) => dom.tabPanel);
    this.tabPanels.forEach((tabPanel) => this.dom.append(tabPanel));

    this.setCurrentTabIndex(this.currentTabIndex);
  }

  /**
   * Get tablist DOM.
   * @returns {HTMLElement} Tablist DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build a tab
   * @param {object} params Parameters.
   * @returns {HTMLElement} Tab DOM element.
   */
  buildTab(params = {}) {
    const tab = document.createElement('button');
    tab.classList.add('h5p-editor-gamemap-cheat-options-tab');
    tab.setAttribute('id', params.tabId);
    tab.setAttribute('type', 'button');
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', params.tabPanelId);
    tab.setAttribute('tabindex', '-1');

    const label = document.createElement('div');
    label.classList.add('h5p-editor-gamemap-cheat-options-tab-label');
    label.innerText = params.label;
    tab.append(label);

    return tab;
  }

  /**
   * Build a tab panel.
   * @param {object} params Parameters.
   * @returns {HTMLElement} Tab panel.
   */
  buildTabPanel(params = {}) {
    const tabPanel = document.createElement('div');
    tabPanel.classList.add('h5p-editor-gamemap-cheat-options-tab-panel', 'display-none');
    tabPanel.setAttribute('role', 'tabpanel');
    tabPanel.setAttribute('id', params.tabPanelId);
    tabPanel.setAttribute('aria-labelledby', params.tabId);
    tabPanel.append(params.content);

    return tabPanel;
  }

  /**
   * Destroy tablist.
   */
  destroy() {
    this.tabList.removeEventListener('keydown', this.handleTabListKeyDown);
    this.tabList.removeEventListener('click', this.handleTabListClick);

    this.dom.remove();
  }

  /**
   * Set current tab index.
   * @param {number} index New current tab index.
   */
  setCurrentTabIndex(index) {
    if (typeof index !== 'number' || Number.isNaN(index) || index < 0 || index >= this.tabs.length ) {
      return;
    }

    this.currentTabIndex = index;

    this.tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', selected);
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });

    this.tabPanels.forEach((tabPanel, i) => {
      if (i === index) {
        tabPanel.classList.remove('display-none');
      }
      else {
        tabPanel.classList.add('display-none');
      }
    });
  }

  /**
   * Set focus to a tab.
   * @param {number} index Index of tab to set focus to.
   */
  setFocusToTab(index) {
    if (typeof index !== 'number' || Number.isNaN(index) || index < 0 || index >= this.tabs.length) {
      return;
    }

    this.setCurrentTabIndex(index);
    this.tabs[index].focus();
  }

  /**
   * Handle key down on tablist.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleTabListKeyDown(event) {
    if (!this.tabs.length) {
      return;
    }

    if (event.key === 'ArrowRight') {
      const nextIndex = (this.currentTabIndex + 1) % this.tabs.length;
      this.setFocusToTab(nextIndex);
    }
    else if (event.key === 'ArrowLeft') {
      const nextIndex = (this.currentTabIndex - 1 + this.tabs.length) % this.tabs.length;
      this.setFocusToTab(nextIndex);
    }
    else if (event.key === 'Home') {
      this.setFocusToTab(0);
    }
    else if (event.key === 'End') {
      this.setFocusToTab(this.tabs.length - 1);
    }
    else {
      return;
    }

    event.preventDefault();
  }

  /**
   * Handle click.
   * @param {@PointerEvent} event Pointer event.
   */
  handleTabListClick(event) {
    let target = event.target.closest('.h5p-editor-gamemap-cheat-options-tab');
    const clickedTabIndex = this.tabs.findIndex((tab) => tab === target);
    if (clickedTabIndex === -1) {
      return;
    }

    this.setFocusToTab(clickedTabIndex);
  }
}
