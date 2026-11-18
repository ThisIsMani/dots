// The Memory dropdown (the pill's click): Herdr's own memory, then each space → tab →
// terminal → the processes it started, collapsible, biggest first. A terminal's name
// jumps to it. What's open is remembered (localStorage; the dropdown's props never change).

import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, theme, terminals, spaces, run, closeOverlay } from "herdr";
import { cache, readTree, fmt } from "./ram.js";

const REFRESH = 8000; // footprint over every terminal process takes about a second
const ROW = 26;
export const SIZE = { width: 460, height: 560 };
const INDENT = 16;

function load() {
  try {
    return JSON.parse(localStorage.getItem("open") ?? "null");
  } catch {
    return null;
  }
}


function tile(t, program, fallback) {
  const g = program;
  return div()
    .flex_none()
    .w(18)
    .h(18)
    .rounded(5)
    .border_1()
    .border_color(t.border)
    .bg(g?.tile ?? t.surface)
    .flex()
    .items_center()
    .justify_center()
    .text_size(10)
    .text_color(t.muted)
    .child(
      g?.icon
        ? g.tint
          ? svg(g.icon).size(11).text_color(g.color ?? t.foreground)
          : image(g.icon).w(11).h(11)
        : (fallback ?? "?").slice(0, 1).toUpperCase(),
    );
}

export class MemoryView extends View {
  init(_props, cx) {
    // Open groups by id. Default: the sections and spaces open, tabs and below closed.
    this.open = new Set(load() ?? ["herdr", "terminals"]);
    this.fresh = !load();
    this.tree = null;
    this.busy = false;
    this.refresh(cx);
    cx.timer.every(REFRESH, (cx) => this.refresh(cx));
  }

  refresh(cx) {
    if (this.busy) return;
    this.busy = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        this.tree = await readTree(terminals(), spaces());
        if (this.fresh) {
          this.tree.spaces.forEach((s) => this.open.add(`s:${s.id}`));
          this.fresh = false;
        }
      } catch (e) {
        this.error = String(e?.message ?? e);
      }
      this.busy = false;
      cx.notify();
    });
  }

  toggle(id) {
    this.open.has(id) ? this.open.delete(id) : this.open.add(id);
    try {
      localStorage.setItem("open", JSON.stringify([...this.open]));
    } catch {}
  }

  // One line of the tree. `id` set: it folds (chevron + click). `go`: the label jumps.
  line(t, { id, depth, lead, label, note, mb, of, color, go, strong }) {
    const open = id && this.open.has(id);
    const share = of > 0 ? Math.max(0.03, Math.min(1, mb / of)) : 0;
    return h_flex()
      .id(`row-${id ?? label}-${depth}-${note ?? ""}`)
      .flex_none()
      .h(ROW)
      .pl(6 + depth * INDENT)
      .pr(8)
      .gap(7)
      .items_center()
      .rounded(6)
      .text_size(12.5)
      .when(Boolean(id || go), (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)))
      .on_click((_e, cx) => {
        if (id) {
          this.toggle(id);
          cx.notify();
        } else if (go) go();
      })
      .child(
        div()
          .flex_none()
          .w(10)
          .text_size(10)
          .text_color(t.dim)
          .child(id ? (open ? "▾" : "▸") : ""),
      )
      .when(Boolean(lead), (el) => el.child(lead))
      .child(
        div()
          .flex_shrink(0)
          .max_w(200)
          .truncate()
          .text_color(strong ? t.foreground : t.muted)
          .when(Boolean(strong), (el) => el.font_semibold())
          .child(label),
      )
      .when(Boolean(note), (el) => el.child(div().min_w(0).flex_shrink(1).truncate().text_size(11.5).text_color(t.dim).child(note)))
      .child(div().flex_1())
      .child(
        div()
          .flex_none()
          .w(54)
          .h(4)
          .rounded_full()
          .bg(t.raised)
          .child(div().h_full().rounded_full().bg(color ?? t.accent).w(`${share * 100}%`)),
      )
      .child(div().flex_none().w(62).text_size(12).text_color(t.muted).child(div().w_full().flex().justify_end().child(fmt(mb))));
  }

  // A terminal: jump by clicking its name; its processes fold under it. Bars share one scale (`of`).
  terminal(t, r, depth, of) {
    const rows = [];
    const id = `t:${r.address}`;
    const label = r.sub ? `↳ ${r.name}` : r.name;
    rows.push(
      this.line(t, {
        id: r.procs.length > 1 ? id : null,
        depth,
        lead: tile(t, r.program, r.name),
        label,
        note: `${r.address}${r.title ? ` · ${r.title}` : ""}`,
        mb: r.mb,
        of,
        color: t.working,
        go: () => {
          closeOverlay(props().overlay);
          run("pane.focus", { terminal: r.address });
        },
        strong: true,
      }),
    );
    if (r.procs.length > 1 && this.open.has(id))
      r.procs.forEach((p) =>
        rows.push(this.line(t, { depth: depth + 1, label: p.name, note: p.pid, mb: p.mb, of, color: t.dim })),
      );
    return rows;
  }

  body(t) {
    const tree = this.tree;
    if (!tree) return [div().p(12).text_size(12).text_color(t.dim).child(this.error ?? "Measuring…")];
    const rows = [];
    const h = tree.herdr;

    rows.push(this.line(t, { id: "herdr", depth: 0, label: "Herdr", note: "counted in the pill", mb: h.mb, of: h.mb, strong: true }));
    if (this.open.has("herdr")) {
      rows.push(this.line(t, { id: "herdr:window", depth: 1, label: "Window", note: "mods, screens, scrollback", mb: h.app, of: h.mb }));
      if (this.open.has("herdr:window"))
        h.kinds.forEach(([k, v]) => rows.push(this.line(t, { depth: 2, label: k, mb: v, of: h.app, color: t.dim })));
      rows.push(this.line(t, { id: "herdr:core", depth: 1, label: "herdr-core", note: `${h.core.length} processes`, mb: h.core.reduce((s, c) => s + c.mb, 0), of: h.mb }));
      if (this.open.has("herdr:core"))
        h.core.forEach((c) => rows.push(this.line(t, { depth: 2, label: "herdr-core", note: c.pid, mb: c.mb, of: h.mb, color: t.dim })));
    }

    rows.push(div().flex_none().h(8));
    rows.push(this.line(t, { id: "terminals", depth: 0, label: "Terminals", note: "not in the pill", mb: tree.terminalsMb, of: tree.terminalsMb, color: t.working, strong: true }));
    if (this.open.has("terminals"))
      for (const s of tree.spaces) {
        const sid = `s:${s.id}`;
        rows.push(this.line(t, { id: sid, depth: 1, label: s.name, mb: s.mb, of: tree.terminalsMb, color: t.working, strong: true }));
        if (!this.open.has(sid)) continue;
        for (const c of s.tabs) {
          // A tab with one terminal shows it directly; more fold under the tab.
          if (c.terms.length === 1) {
            rows.push(...this.terminal(t, c.terms[0], 2, tree.terminalsMb));
            continue;
          }
          const cid = `c:${c.id}`;
          rows.push(this.line(t, { id: cid, depth: 2, label: c.name, note: `${c.terms.length} terminals`, mb: c.mb, of: tree.terminalsMb, color: t.working }));
          if (this.open.has(cid)) c.terms.forEach((r) => rows.push(...this.terminal(t, r, 3, tree.terminalsMb)));
        }
      }
    return rows;
  }

  render() {
    const t = theme();
    const tree = this.tree;
    const total = tree ? tree.herdr.mb + tree.terminalsMb : null;
    return v_flex()
      .id("memory")
      // A popup doesn't stretch its root: draw at the size the pill opened it with.
      .w(cache.drop?.width ?? SIZE.width)
      .h(cache.drop?.height ?? SIZE.height)
      .child(
        h_flex()
          .flex_none()
          .h(44)
          .px(14)
          .gap(10)
          .items_center()
          .border_b_1()
          .border_color(t.border)
          .child(div().text_size(13).font_semibold().text_color(t.foreground).child("Memory"))
          .child(
            div()
              .text_size(12)
              .text_color(t.dim)
              .child(total === null ? "" : `${fmt(total)} with terminals`),
          )
          .child(div().flex_1())
          .child(
            div()
              .id("refresh")
              .px(8)
              .h(24)
              .flex()
              .items_center()
              .rounded(6)
              .text_size(12)
              .text_color(this.busy ? t.dim : t.muted)
              .cursor_pointer()
              .hover((s) => s.bg(t.hover).text_color(t.foreground))
              .on_click((_e, cx) => this.refresh(cx))
              .child(this.busy ? "measuring…" : "refresh"),
          )
          .child(
            div()
              .id("close")
              .w(24)
              .h(24)
              .flex()
              .items_center()
              .justify_center()
              .rounded(6)
              .text_size(13)
              .text_color(t.muted)
              .cursor_pointer()
              .hover((s) => s.bg(t.hover).text_color(t.foreground))
              .on_click(() => closeOverlay(props().overlay))
              .child("✕"),
          ),
      )
      .child(
        v_flex()
          .id("memory-body")
          .flex_1()
          .min_h(0)
          .p(8)
          .overflow_y_scrollbar()
          .children(this.body(t)),
      );
  }
}
