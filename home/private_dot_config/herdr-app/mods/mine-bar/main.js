// mine's bottom bar: spaces as tab groups (the shown one with its tabs), agent summary, window controls.
// Cloned from Herdr's terminals-bar; colors now come from the theme.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, agents, run, theme, props, settings, openOverlay, window as win } from "herdr";
import { AgentList, cache, listHeight, WIDTH } from "./agents.js";
import { toggleDropdown } from "./anchor.js";

// Agent summary, most urgent first. A click opens that status's agents above the pill
// (agents.js: this mod again, as a dropdown).
// A label whose color changes by cross-fading two copies (colors can't be animated, opacity can),
// in step with the sliding pill. Both copies have the same weight, so the label never changes width.
const FADE = { duration: 220, easing: "ease-out" };
function crossfade(id, text, on, off_color, on_color) {
  const layer = (suffix, color, shown) =>
    div().id(`${id}-${suffix}`).truncate().text_color(color).opacity(shown ? 1 : 0).transition("opacity", FADE).child(text);
  return div()
    .id(id)
    .relative()
    .min_w(0)
    .child(layer("off", off_color, !on))
    .child(layer("on", on_color, on).absolute().top(0).left(0).right(0));
}

const STATUSES = [
  ["blocked", "needs you"],
  ["done", "done"],
  ["working", "working"],
  ["idle", "idle"],
];

// The bar's colors, by theme role. The shown tab stands out; a hovered one only hints.
function colors(t) {
  return { tray: t.chrome, tab: t.raised, tabEdge: t.input, hover: t.hover, edge: t.raised, chip: t.surface, text: t.foreground, soft: t.muted, dim: t.dim, line: t.border };
}


// The pane a tab's tab speaks for: the focused one, else its agent, else the first.
function lead(all, id) {
  const mine = all.filter((p) => p.tab === id);
  return mine.find((p) => p.focused) ?? mine.find((p) => p.program?.agent) ?? mine[0];
}

// The program's tile from the app's table: its color, its glyph (or logo) on it.
function tile(t, p) {
  const C = colors(t);
  const g = p?.program;
  const dot = p?.status && p.status !== "idle" ? t[p.status] : null;
  return div()
    .relative()
    .flex_none()
    .w(22)
    .h(22)
    .rounded(6)
    .border_1()
    .border_color(C.line)
    .bg(g?.tile ?? C.chip)
    .flex()
    .items_center()
    .justify_center()
    .when(Boolean(g?.icon), (el) =>
      el.child(g.tint ? svg(g.icon).size(13).text_color(g.color ?? C.text) : image(g.icon).w(13).h(13)),
    )
    .when(Boolean(dot), (el) =>
      el.child(div().absolute().top(-3).right(-3).w(9).h(9).rounded_full().border_2().border_color(C.tray).bg(dot)),
    );
}

// A control in the draggable bar: the press is its own, not the window's
// (a right press there would open the system's window menu).
function own(el) {
  return el.on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_mouse_down("right", (_e, cx) => cx.stop_propagation());
}

function windowButton(C, id, icon, command) {
  return own(
    div()
      .id(id)
      .flex_none()
      .w(24)
      .h(24)
      .rounded_full()
      .flex()
      .items_center()
      .justify_center()
      .bg(C.chip)
      .text_color(C.dim)
      .cursor_pointer()
      .hover((s) => s.bg(C.edge).text_color(C.text))
      .on_click(() => run(command))
      .child(svg(`mods/mine-bar/${icon}.svg`).size(14)),
  );
}

export default class MineBar extends View {
  init(_props, cx) {
    // The copy opened as the agents dropdown.
    if (props()?.overlay) {
      this.view = cx.new(AgentList);
      return;
    }
    this.bounds = {}; // status -> its pill's bounds, from the press
    this.widths = {}; // item and gap id -> measured width, for the sliding highlights
    this.last = {}; // highlight name -> its last geometry, kept while new items measure
  }

  // Remembers an item's (or gap's) width; a change redraws so the highlight can move.
  measure(id) {
    return (size, cx) => {
      if (Math.abs((this.widths[id] ?? -1) - size.width) < 0.5) return;
      this.widths[id] = size.width;
      cx.notify();
    };
  }

  // A row's items with a measured gap element between each pair (see slider).
  spaced(name, items, gap) {
    return items.flatMap((el, i) => {
      if (i === 0) return [el];
      const id = `tm-gap-${name}-${i}`;
      return [div().id(id).flex_none().w(gap).h(1).on_size_change(this.measure(id)), el];
    });
  }

  // A highlight that slides (and stretches) to the active item of a row laid out by spaced()
  // from `pad`. Its place is the sum of the measured widths before it, gaps included: on a 1x
  // screen layout snaps every edge to whole pixels, and only measured gaps keep that rounding
  // from adding up. Until the items are measured it stays where it was.
  slider(name, ids, active, pad) {
    const zoom = Number(settings()?.zoom) || 1;
    const seq = ids.flatMap((id, i) => (i === 0 ? [id] : [`tm-gap-${name}-${i}`, id]));
    let geo = null;
    if (active >= 0 && seq.every((id) => this.widths[id] > 0)) {
      const at = seq.indexOf(ids[active]);
      let px = 0;
      for (let i = 0; i < at; i++) px += this.widths[seq[i]];
      geo = { left: pad + px / zoom, width: this.widths[ids[active]] / zoom };
      this.last[name] = geo;
    }
    geo ??= this.last[name];
    if (!geo) return null;
    const motion = { duration: 220, easing: "ease-out" };
    return div()
      .id(`tm-slide-${name}`)
      .absolute()
      .top(pad)
      .h(24)
      .left(geo.left)
      .w(geo.width)
      .transition("left", motion)
      .transition("width", motion);
  }

  // The dropdown went (Esc, a click elsewhere, a pill): the next click opens one again.
  close() {
    if (!this.view) return;
    cache.list?.closed(); // goes back unless an agent was chosen
    cache.list = null;
    if (cache.drop?.id === props()?.overlay) {
      cache.drop.closed = true;
      cache.drop.closedAt = Date.now();
    }
  }

  // Pills for each status that has agents: a dot (pulsing while working) and "N label".
  summary(t, C) {
    // Most recently changed first, so a click goes to the freshest one.
    const list = agents().slice().sort((a, b) => b.seq - a.seq);
    return STATUSES.map(([status, label]) => {
      const mine = list.filter((a) => a.status === status);
      if (!mine.length) return null;
      const dot = div().w(8).h(8).rounded_full().bg(t[status]);
      return own(h_flex())
        .id(`tm-agents-${status}`)
        .flex_none()
        .h(22)
        .px(10)
        .gap(7)
        .items_center()
        .rounded_full()
        .cursor_pointer()
        .text_size(12)
        .text_color(status === "blocked" ? t.blocked : C.soft)
        .hover((s) => s.bg(C.hover).text_color(C.text))
        .on_mouse_down("left", (e) => (this.bounds[status] = e.bounds))
        .on_click((_e, cx) => {
          // Another pill's dropdown is open: the press closed it; open this one.
          const other = cache.drop && cache.drop.status !== status;
          const drop = toggleDropdown(other ? null : cache.drop, this.bounds[status], {
            mod: "mine-bar",
            props: { status },
            width: WIDTH,
            height: listHeight(mine.length),
          });
          cache.drop = drop && { ...drop, status };
          cx.notify();
        })
        .child(status === "working" ? dot.loop("opacity", { from: 0.35, to: 1, period: 1200 }) : dot)
        .child(div().child(`${mine.length} ${label}`));
    }).filter(Boolean);
  }

  render() {
    if (this.view) return this.view;
    const t = theme();
    const C = colors(t);
    const space = spaces().find((p) => p.active);
    if (!space) return div();
    const all = panes();
    const w = win() ?? {};
    const pills = this.summary(t, C);
    const all_spaces = spaces();

    // A tab inside its space's group.
    const tab = (space, c) => {
      const p = lead(all, c.id);
      return own(h_flex())
        .id(`tm-${c.id}`)
        .flex_shrink(1)
        .max_w(260)
        .min_w(0)
        .h_full()
        .pl(5)
        .pr(12)
        .gap(9)
        .items_center()
        .rounded(11)
        .border_1()
        .cursor_pointer()
        .text_size(12.5)
        // The shown tab: blue with dark text, as zellij's selected tab (ribbon_selected).
        // The shown tab's blue is the sliding pill behind it (drawn here until it's measured).
        .border_color("#00000000")
        .when(c.active && !this.last.tab, (el) => el.bg(t.accent).border_color(t.accent))
        .when(!c.active, (el) => el.hover((s) => s.bg(C.hover)))
        .on_size_change(this.measure(`tm-${c.id}`))
        .on_click(() => run("tab.select", { id: c.id }))
        .on_mouse_down("right", () =>
          openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }),
        )
        .child(tile(t, p))
        .child(crossfade(`tm-name-${c.id}`, c.name, c.active, C.soft, t.accent_foreground));
    };

    // A space as a chip with its full name (chips = spaces, pills = tabs). The shown one is
    // outlined and underlined in the accent, never wider (same weight), so the tabs after the
    // chips never move. A click on the shown one opens the space picker, on another switches to it.
    // Another space with an agent that is working or needs attention gets a status dot.
    const chip = (space) => {
      const dot = !space.active && space.status && space.status !== "idle" ? t[space.status] : null;
      return own(h_flex())
        .id(`tm-space-${space.id}`)
        .relative()
        .flex_none()
        .h(24)
        .px(11)
        .items_center()
        .justify_center()
        .rounded(11)
        .cursor_pointer()
        .text_size(12)
        .font_semibold()
        .when(space.active, (el) => el.text_color(t.accent_foreground))
        .when(space.active && !this.last.space, (el) => el.bg(t.accent))
        .when(!space.active, (el) => el.hover((s) => s.bg(C.hover)))
        .on_size_change(this.measure(`tm-space-${space.id}`))
        .on_click(() =>
          space.active
            ? openOverlay({ mod: "picker", kind: "popup", at: "top", offset: 40, width: 640, height: 0.8 })
            : run("space.select", { id: space.id }),
        )
        .on_mouse_down("right", () =>
          openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: space.id } } }),
        )
        .child(crossfade(`tm-sname-${space.id}`, space.name || "~", space.active, C.soft, t.accent_foreground))
        .when(Boolean(dot), (el) =>
          el.child(div().absolute().top(-3).right(-3).w(9).h(9).rounded_full().border_2().border_color(C.tray).bg(dot)),
        );
    };

    return h_flex()
      .size_full()
      .gap(8)
      .items_center()
      // Every space on the left; the tabs after them start at the same place whichever is shown.
      // The shown space's accent outline slides over the chips to the new one.
      .child(
        h_flex()
          .relative()
          .flex_none()
          .h(30)
          .p(3)
          .items_center()
          .rounded(14)
          .bg(C.tray)
          .children([
            this.slider("space", all_spaces.map((p) => `tm-space-${p.id}`), all_spaces.findIndex((p) => p.active), 3)
              ?.rounded(11)
              .bg(t.accent),
          ].filter(Boolean))
          .children(this.spaced("space", spaces().map(chip), 3)),
      )
      .child(div().flex_none().w(2).h(20).rounded(1).bg(C.line))
      // The shown space's tabs, over a blue pill that slides to the shown one (and across spaces).
      .child(
        h_flex()
          .relative()
          .flex_shrink(1)
          .min_w(0)
          .h(30)
          .p(3)
          .children([
            this.slider("tab", space.tabs.map((c) => `tm-${c.id}`), space.tabs.findIndex((c) => c.active), 3)
              ?.rounded(11)
              .bg(t.accent),
          ].filter(Boolean))
          .children(this.spaced("tab", space.tabs.map((c) => tab(space, c)), 3)),
      )
      .child(div().flex_1())
      .when(pills.length > 0, (el) =>
        el.child(h_flex().flex_none().h(30).p(4).gap(2).items_center().rounded(14).bg(C.tray).children(pills)),
      )
      .when(Boolean(w.buttons), (el) =>
        el.child(
          h_flex()
            .flex_none()
            .pl(6)
            .pr(4)
            .gap(8)
            .child(windowButton(C, "tm-min", "win-min", "window.minimize"))
            .child(windowButton(C, "tm-max", w.maximized ? "win-restore" : "win-max", "window.maximize"))
            .child(windowButton(C, "tm-close", "win-close", "window.close")),
        ),
      );
  }
}
