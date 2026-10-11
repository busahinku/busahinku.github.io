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

// The ask bar, lifted into a layer of its own while a transition animates.
// Left inside the page's snapshot, Chrome-based browsers on Android (Brave,
// Chrome) lay the snapshot out as if the toolbar were hidden, so the bar
// dipped by the toolbar's height and came back. Named only for that moment: a
// name makes an element a backdrop root, which would cut the bar's blur off
// from the page behind it. Never under an open menu or dialog, where a named
// layer would be painted on top of them. Returns the undo.
export function liftAsk() {
  const ask = document.querySelector<HTMLElement>("[data-ask]");
  if (!ask || document.querySelector(".mobile-menu.active, dialog[open]")) return () => {};
  ask.style.viewTransitionName = "ask";
  return () => ask.style.removeProperty("view-transition-name");
}
