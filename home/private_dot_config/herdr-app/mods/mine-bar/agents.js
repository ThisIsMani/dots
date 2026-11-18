// The agents dropdown: a status pill's click opens the agents with that status above it.
// Moving through it (↑/↓, j/k, or the pointer) shows that agent in its real pane behind the
// list once the selection settles; Enter or a click stays there; Esc, a click elsewhere, or
// the pointer leaving the list goes back to where you were. The list is the one at opening
// (looking at a "done" agent makes it idle; it shouldn't vanish while you browse).
// Agent-finder (⌥') behaves the same; this is its bar-sized sibling.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, focused, run, theme, props, closeOverlay } from "herdr";

export const TITLES = { blocked: "Needs you", done: "Done", working: "Working", idle: "Idle" };
export const WIDTH = 440;
const HEAD = 38;
const ROW = 46; // name line + message line
const PAD = 6;
const SETTLE_MS = 150;

// Shared by mine-bar's copies (module code runs once): the open dropdown and its list.
export const cache = { drop: null, list: null };

// The dropdown's height for this many agents (fixed rows, so it fits; the anchor caps it).
export function listHeight(n) {
  return HEAD + 2 * PAD + Math.max(1, n) * ROW;
}

function ago(ms) {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export class AgentList extends View {
  init(_props, cx) {
    this.status = props()?.status ?? "working";
    const f = focused();
    this.origin = f ? { space: f.space, tab: f.tab, pane: f.pane } : null;
    this.moved = false; // showed another agent; leaving without choosing goes back
    this.ended = false;
    cache.list = this; // Herdr tells mine-bar's View when the dropdown goes, not this nested one
    // Most recently changed first, as the pill's count was.
    this.list = agents()
      .filter((a) => a.status === this.status)
      .sort((a, b) => b.seq - a.seq)
      .map((a) => a.address);
    this.at = Math.max(0, this.list.findIndex((addr) => agents().find((a) => a.address === addr)?.focused));
    this.focus = cx.focus_handle();
    this.focus.focus();
    cx.timer.after(200, () => this.focus.focus());
  }

  // The listed agents, live (gone ones drop out).
  entries() {
    const live = new Map(agents().map((a) => [a.address, a]));
    const term = new Map(terminals().map((x) => [x.address, x]));
    return this.list
      .map((addr) => live.get(addr))
      .filter(Boolean)
      .map((a) => {
        const x = term.get(a.address) ?? {};
        return {
          a,
          name: a.title && a.title !== a.program?.name ? a.title : a.program?.name ?? a.address,
          where: `${a.space_name} / ${a.tab_name}`,
          since: x.status_ms ?? null,
          msg: x.report?.msg ?? x.status?.msg ?? "",
        };
      });
  }

  // The dropdown went for any reason (Esc, click elsewhere, the pill): mine-bar's close() calls this.
  closed() {
    if (!this.ended) this.back();
  }

  back() {
    this.ended = true;
    const o = this.origin;
    if (!this.moved || !o) return;
    run("space.select", { id: o.space });
    run("tab.select", { id: o.tab });
    if (o.pane) run("pane.focus", { pane: o.pane });
  }

  stay(e) {
    this.ended = true;
    closeOverlay(props().overlay);
    if (!e) return;
    if (e.a.pane) run("agent.focus", { terminal: e.a.address });
    else run("terminal.peek", { terminal: e.a.address }); // a sub-agent has no pane
  }

  // Show the selected agent (or, with `home`, where you were) once the selection settles.
  schedule(cx, home = false) {
    const token = (this.token = (this.token ?? 0) + 1);
    cx.timer.after(SETTLE_MS, () => {
      if (token !== this.token || this.ended) return;
      if (home) {
        const o = this.origin;
        if (this.moved && o) {
          run("space.select", { id: o.space });
          run("tab.select", { id: o.tab });
          if (o.pane) run("pane.focus", { pane: o.pane });
          this.moved = false;
        }
      } else {
        const e = this.entries()[this.at];
        if (!e?.a.pane || e.a.focused) return;
        this.moved = true;
        run("agent.focus", { terminal: e.a.address });
      }
      // Showing a pane gives it the keyboard; keep it here.
      this.focus.focus();
    });
  }

  move(by, cx) {
    const n = this.entries().length;
    if (!n) return;
    this.at = (this.at + by + n) % n;
    this.schedule(cx);
  }

  glyph(t, st) {
    if (st === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    return div().w(12).flex_none().text_color(t[st] ?? t.dim).child(st === "idle" ? "○" : "●");
  }

  icon(t, p) {
    if (!p?.icon) return div().w(15).flex_none();
    return p.tint ? svg(p.icon).size(15).flex_none().text_color(p.color ?? t.muted) : image(p.icon).w(15).h(15).flex_none();
  }

  row(t, e, i, on) {
    return v_flex()
      .id(`ag-${e.a.address}`)
      .flex_none()
      .h(ROW)
      .px(10)
      .justify_center()
      .gap(2)
      .rounded(7)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected ?? t.hover))
      .on_hover((hovered, cx) => {
        if (!hovered || this.at === i) return;
        this.at = i;
        this.schedule(cx);
        cx.notify();
      })
      .on_click(() => this.stay(e))
      .child(
        h_flex()
          .gap(9)
          .items_center()
          .text_size(12.8)
          .child(this.glyph(t, e.a.status))
          .child(this.icon(t, e.a.program))
          .child(div().flex_1().min_w(0).truncate().text_color(on ? t.foreground : t.muted).when(on, (d) => d.font_semibold()).child(e.name))
          .when(!e.a.pane, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("no pane")))
          .child(div().flex_none().max_w(170).truncate().text_size(11.5).text_color(t.dim).child(e.where))
          .child(div().flex_none().w(30).text_size(11.5).text_color(t.dim).child(ago(e.since))),
      )
      .child(
        div()
          .pl(46)
          .truncate()
          .text_size(11.5)
          .text_color(e.a.status === "blocked" ? t.blocked : t.dim)
          .child(e.msg || " "),
      );
  }

  render() {
    const t = theme();
    const list = this.entries();
    this.at = Math.max(0, Math.min(this.at, list.length - 1));
    const st = this.status;
    return v_flex()
      .id("agents-drop")
      // A popup doesn't stretch its root: draw at the size the pill opened it with.
      .w(cache.drop?.width ?? WIDTH)
      .h(cache.drop?.height ?? listHeight(list.length))
      .track_focus(this.focus)
      .on_key_down((ev, cx) => {
        const k = ev.key;
        const ctrl = ev.modifiers?.control;
        if (k === "escape") return closeOverlay(props().overlay); // close() goes back
        if (k === "enter") return this.stay(list[this.at]);
        if (k === "down" || k === "j" || (ctrl && k === "n")) this.move(1, cx);
        else if (k === "up" || k === "k" || (ctrl && k === "p")) this.move(-1, cx);
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(
        h_flex()
          .flex_none()
          .h(HEAD)
          .px(16)
          .gap(8)
          .items_center()
          .border_b_1()
          .border_color(t.border)
          .child(div().w(8).h(8).rounded_full().bg(t[st] ?? t.dim))
          .child(div().text_size(13).font_semibold().text_color(st === "blocked" ? t.blocked : t.foreground).child(TITLES[st] ?? st))
          .child(div().text_size(12).text_color(t.dim).child(String(list.length)))
          .child(div().flex_1())
          .child(div().text_size(11).text_color(t.dim).child("↑↓ show · ↵ stay · esc back")),
      )
      .child(
        v_flex()
          .id("agents-drop-list")
          .flex_1()
          .min_h(0)
          .p(PAD)
          .overflow_y_scrollbar()
          // The pointer leaving the list puts back what was showing when it opened.
          .on_hover((hovered, cx) => {
            if (!hovered) this.schedule(cx, true);
          })
          .when(list.length === 0, (el) => el.child(div().px(10).py(12).text_size(12.5).text_color(t.dim).child("None any more.")))
          .children(list.map((e, i) => this.row(t, e, i, i === this.at))),
      );
  }
}
