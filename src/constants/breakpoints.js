/** Viewport breakpoints — width only, never device type. Must match tokens.js. */
export const BP_WIDE_MIN = 768;

export const MQ_WIDE = `(min-width: ${BP_WIDE_MIN}px)`;
export const MQ_COMPACT = `(max-width: ${BP_WIDE_MIN - 1}px)`;
