/**
 * Viewport breakpoints — width only, never device type.
 * Must match `--bp-*-min` in `src/styles/tokens.js`.
 *
 * | Name    | Min width | Use |
 * |---------|-----------|-----|
 * | compact | (default) | Phone-first base layout |
 * | sm      | 640px     | Typography + layout step (16px gutters/insets) |
 * | md      | 768px     | Reserved for future layout steps |
 * | lg      | 1024px    | Typography step |
 * | xl      | 1280px    | Reserved for future wide layout tweaks |
 */
export const BP_SM_MIN = 640;
export const BP_MD_MIN = 768;
export const BP_LG_MIN = 1024;
export const BP_XL_MIN = 1280;

/** @deprecated Prefer BP_MD_MIN */
export const BP_WIDE_MIN = BP_MD_MIN;

export const MQ_SM = `(min-width: ${BP_SM_MIN}px)`;
export const MQ_MD = `(min-width: ${BP_MD_MIN}px)`;
export const MQ_LG = `(min-width: ${BP_LG_MIN}px)`;
export const MQ_XL = `(min-width: ${BP_XL_MIN}px)`;

export const MQ_COMPACT = `(max-width: ${BP_MD_MIN - 1}px)`;
