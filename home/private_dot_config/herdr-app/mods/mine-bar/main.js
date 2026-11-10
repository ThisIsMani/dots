// mine's bottom bar: spaces as tab groups (the shown one with its tabs), agent summary, window controls.
// Cloned from Herdr's terminals-bar; colors now come from the theme.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, agents, run, theme, openOverlay, window as win } from "herdr";

// Agent summary, most urgent first. A click jumps to an agent with that status;
// clicking again goes to the next one.
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
  init() {
    this.turn = {}; // status -> how many times its pill was clicked
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
        .on_click(() => {
          const n = this.turn[status] ?? 0;
          this.turn[status] = n + 1;
          run("agent.focus", { terminal: mine[n % mine.length].address });
        })
        .child(status === "working" ? dot.loop("opacity", { from: 0.35, to: 1, period: 1200 }) : dot)
        .child(div().child(`${mine.length} ${label}`));
    }).filter(Boolean);
  }

  render() {
    const t = theme();
    const C = colors(t);
    const space = spaces().find((p) => p.active);
    if (!space) return div();
    const all = panes();
    const w = win() ?? {};
    const pills = this.summary(t, C);

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
        .when(c.active, (el) => el.bg(t.accent).border_color(t.accent))
        .when(!c.active, (el) => el.border_color("#00000000").hover((s) => s.bg(C.hover)))
        .on_click(() => run("tab.select", { id: c.id }))
        .on_mouse_down("right", () =>
          openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }),
        )
        .child(tile(t, p))
        .child(div().min_w(0).truncate().text_color(c.active ? t.accent_foreground : C.soft).when(c.active, (d) => d.font_semibold()).child(c.name));
    };

    // A space's label, like a Chrome tab group's. The shown space's opens the space picker;
    // another's switches to it. A collapsed space shows its most urgent agent status as a dot.
    const label = (space) => {
      const dot = !space.active && space.status && space.status !== "idle" ? t[space.status] : null;
      return own(h_flex())
        .id(`tm-space-${space.id}`)
        .flex_none()
        .h_full()
        .px(10)
        .gap(7)
        .items_center()
        .rounded(11)
        .cursor_pointer()
        .text_size(12.5)
        .text_color(space.active ? C.text : C.soft)
        .hover((s) => s.bg(C.hover).text_color(C.text))
        .on_click(() =>
          space.active
            ? openOverlay({ mod: "picker", kind: "popup", at: "top", offset: 40, width: 640, height: 0.8 })
            : run("space.select", { id: space.id }),
        )
        .on_mouse_down("right", () =>
          openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: space.id } } }),
        )
        .child(svg("mods/mine-bar/stack.svg").size(14).text_color(space.active ? t.accent : C.dim))
        .child(div().max_w(160).truncate().when(space.active, (el) => el.font_semibold()).child(space.name))
        .when(Boolean(dot), (el) => el.child(div().w(7).h(7).rounded_full().bg(dot)));
    };

    // Every space is a group: the shown one with its tabs, the others folded to their label.
    const group = (space) =>
      h_flex()
        .id(`tm-group-${space.id}`)
        .when(space.active, (el) => el.flex_shrink(1).min_w(0))
        .when(!space.active, (el) => el.flex_none())
        .h(30)
        .p(3)
        .gap(3)
        .rounded(14)
        .bg(C.tray)
        .child(label(space))
        .when(space.active, (el) => el.children(space.tabs.map((c) => tab(space, c))));

    return h_flex()
      .size_full()
      .gap(8)
      .items_center()
      .children(spaces().map(group))
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
