/**
 * @constant {object} DEFAULT_SIZE_PERCENT Size or stage element.
 * Beware that height will need to be be adjusted to canvas ratio. Default value
 * of 4.375% is compromise. Feels large on 1920 wide screens, but still leaving
 * 42px for good a11y on 960 wide screens.
 */
export const DEFAULT_SIZE_PERCENT = Object.freeze({
  height: 4.375,
  width: 4.375,
});

/** @constant {object} ROAMING_TYPES Roaming types settable in semantics. */
export const ROAMING_TYPES = Object.freeze({
  FREE: 'free',
  COMPLETE: 'complete',
  SUCCESS: 'success',
});

/** @constant {object} STAGE_TYPES Types lookup for stages. */
export const STAGE_TYPES = Object.freeze({
  STAGE: 0,
  SPECIAL_STAGE: 1,
});

/** @constant {object} SPECIAL_STAGE_TYPES Types lookup for special stages. */
export const SPECIAL_STAGE_TYPES = Object.freeze({
  EXTRA_LIFE: 'extra-life',
  EXTRA_TIME: 'extra-time',
  LINK: 'link',
  TELEPORT: 'teleport',
});
