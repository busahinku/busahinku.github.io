import { pageKey } from "./engagement";

// Whether to animate at all: not without view transitions, not with reduced
// motion, not on e-ink (a slow panel smears every frame).
export const canAnimate = () =>
  typeof document !== "undefined" &&
  !!document.startViewTransition &&
  document.documentElement.dataset.theme !== "eink" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The view-transition-name a project's cover carries both on its archive card
// and on its page, so one grows into the other. Both languages share it.
export const coverName = (path: string) => `cover-${pageKey(path).replace(/\//g, "-")}`;
