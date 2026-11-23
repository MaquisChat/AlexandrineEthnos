/**
 * Every figure in the game is built on these named parts, so one set of gestures works on everyone.
 * root > hips > torso > (head, arm_l, arm_r); hips > (leg_l, leg_r).
 */
export const FIGURE_NODES = ["root", "hips", "torso", "head", "arm_l", "arm_r", "leg_l", "leg_r"] as const;
export type FigureNode = (typeof FIGURE_NODES)[number];

/** Animations every figure file carries. */
export const FIGURE_ANIMATIONS = ["idle", "walk"] as const;
export type FigureAnimation = (typeof FIGURE_ANIMATIONS)[number];

/** Standing height of a figure in metres, feet at y = 0, facing +Z. */
export const FIGURE_HEIGHT_M = 1.7;
