// A dropdown that belongs to a bar control: a Herdr popup (its frame; Esc and an outside
// click close it) right-aligned with the control and just above it, as the bar is at the
// bottom. Self-contained so another bar mod can copy it.
//
//   el.on_mouse_down("left", (e) => (this.bounds = e.bounds))   // where the control is
//     .on_click(() => (this.drop = toggleDropdown(this.drop, this.bounds, { mod, props, width, height })))
//
// Herdr zooms an overlay's size but not its spot, while pointer bounds are already zoomed.

import { settings, openOverlay, closeOverlay } from "herdr";

const GAP = 6;
const MARGIN = 8;

// `drop`: what the last call returned ({ id, width, height, closedAt? }) or null. Returns the new state.
// The dropdown must size its own root to width × height: a popup doesn't stretch it.
export function toggleDropdown(drop, bounds, { mod, props = {}, width, height }) {
  if (drop?.id && !drop.closed) {
    closeOverlay(drop.id);
    return null;
  }
  // A press on the control while it was open closed it already (outside click): stay closed.
  if (drop?.closedAt && Date.now() - drop.closedAt < 250) return null;
  if (!bounds) return null;
  const z = Number(settings().zoom) || 1;
  const h = Math.min(height, (bounds.y - GAP - MARGIN) / z);
  const id = openOverlay({
    mod,
    kind: "popup",
    props,
    width,
    height: h,
    at: {
      x: Math.max(MARGIN, bounds.x + bounds.width - width * z),
      y: Math.max(MARGIN, bounds.y - h * z - GAP),
    },
  });
  return { id, width, height: h }; // what the dropdown should draw at (a popup doesn't size its root)
}
