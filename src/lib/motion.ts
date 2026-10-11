import { pageKey } from "./engagement";

// Whether to animate at all: not without view transitions, not with reduced
// motion, not on e-ink (a slow panel smears every frame).
export const canAnimate = () =>
  typeof document !== "undefined" &&
  !!document.startViewTransition &&
  document.documentElement.dataset.theme !== "eink" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// What a project's cover is called both on its archive card and on its page
// (data-cover), so one can fly into the other. Both languages share it.
export const coverName = (path: string) => `cover-${pageKey(path).replace(/\//g, "-")}`;

