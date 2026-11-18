// Herdr's memory: a pill at the end of mine's bottom bar. A click opens the Memory
// dropdown above it (full.js: Herdr, then space → tab → terminal → processes); another
// click, Esc or a click elsewhere closes it. Both are this mod: the dropdown is the copy
// opened with props { view: "full" }. Numbers are Activity Monitor's "Memory". See ram.js.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { props, theme } from "herdr";
import { cache, readRam, fmt } from "./ram.js";
import { toggleDropdown } from "./anchor.js";
import { MemoryView, SIZE } from "./full.js";

export default class MineRam extends View {
  init(_props, cx) {
    if (props()?.overlay) {
      this.view = cx.new(MemoryView);
      return;
    }
    this.bounds = null;
    this.measure(cx);
    cx.timer.every(10000, (cx) => this.measure(cx));
  }

  measure(cx) {
    cx.spawn(async (cx) => {
      try {
        cache.ram = await readRam();
      } catch {}
      cx.notify();
    });
  }

  // The dropdown went (Esc, a click elsewhere, the pill): the pill's next click opens it again.
  close() {
    if (this.view && cache.drop?.id === props()?.overlay) {
      cache.drop.closed = true;
      cache.drop.closedAt = Date.now();
    }
  }

  render() {
    if (this.view) return this.view;
    const t = theme();
    const total = cache.ram ? cache.ram.app + cache.ram.core : null;
    return h_flex()
      .id("ram-slot")
      .size_full()
      .items_center()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()) // not a window drag
      .when(total !== null, (el) =>
        el.child(
          h_flex()
            .id("ram-pill")
            .w_full()
            .h(30)
            .justify_center()
            .gap(6)
            .items_center()
            .rounded(14)
            .bg(t.chrome)
            .text_size(12)
            .text_color(t.muted)
            .cursor_pointer()
            .hover((s) => s.bg(t.hover).text_color(t.foreground))
            .on_mouse_down("left", (e, cx) => {
              this.bounds = e.bounds;
              cx.stop_propagation();
            })
            .on_click((_e, cx) => {
              cache.drop = toggleDropdown(cache.drop, this.bounds, { mod: "mine-ram", props: { view: "full" }, ...SIZE });
              cx.notify();
            })
            .child(div().text_color(t.dim).child("RAM"))
            .child(div().child(fmt(total))),
        ),
      );
  }
}
