// Agent finder: every agent on every machine, Telescope style, previewed live in place.
// Sized and placed like Herdr's command palette; moving through it takes you to that agent's
// pane behind the list (its real pane, so nothing resizes).
//   ↑/↓ (or ctrl-n/p, ctrl-j/k)  move and show that agent
//   Enter / click                stay there
//   Esc / click outside          go back to where you opened the finder
// Open with mod.open:agent-finder; props().filter pre-fills the filter.
// Commands (keys.json "mod:agent-finder" or agent-finder.<cmd>): next, prev, stay, back.

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { agents, spaces, terminals, machines, focused, run, theme, props, closeOverlay, nextCommand } from "herdr";

const SECTIONS = [
  ["blocked", "Needs you"],
  ["done", "Done"],
  ["working", "Working"],
  ["idle", "Idle"],
];
const SETTLE_MS = 120; // wait this long on a row before showing it, so fast scrolling stays calm

function ago(ms) {
  if (!ms) return "";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default class AgentFinder extends View {
  init(_props, cx) {
    const f = focused();
    this.origin = f ? { space: f.space, tab: f.tab, pane: f.pane } : null;
    this.moved = false; // showed another agent, so leaving without Enter goes back
    this.ended = false;
    this.filter = props()?.filter ?? "";
    this.input = InputState.new({ placeholder: "Filter agents: name, space, machine, status…" });
    if (this.filter) this.input.set_value(this.filter);
    this.input.on("change", (_e, cx) => {
      this.filter = this.input.value();
      this.at = 0;
      this.schedule(cx);
      cx.notify();
    });
    this.input.on("submit", () => this.stay());
    // Start on the agent you're in, if it's listed.
    const pick = this.rows().filter((r) => r.e);
    this.at = Math.max(0, pick.findIndex((r) => r.e.a.focused));
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "next") this.move(1, cx);
        else if (c === "prev") this.move(-1, cx);
        else if (c === "stay") this.stay();
        else if (c === "back") this.cancel();
        cx.notify();
      }
    });
  }

  move(by, cx) {
    const n = this.rows().filter((r) => r.e).length;
    if (!n) return;
    this.at = (this.at + by + n) % n;
    this.schedule(cx);
  }

  // Herdr calls this when the overlay goes for any reason (Esc, click outside, ⌥' again).
  close() {
    if (!this.ended) this.back();
  }

  dismiss() {
    this.ended = true;
    closeOverlay(props().overlay);
  }

  back() {
    this.ended = true;
    const o = this.origin;
    if (!this.moved || !o) return;
    run("space.select", { id: o.space });
    run("tab.select", { id: o.tab });
    if (o.pane) run("pane.focus", { pane: o.pane });
  }

  cancel() {
    this.back();
    closeOverlay(props().overlay);
  }

  stay(e = this.selected()) {
    this.dismiss();
    if (!e) return;
    if (e.a.pane) run("agent.focus", { terminal: e.a.address });
    else run("terminal.peek", { terminal: e.a.address }); // a sub-agent has no pane
  }

  // Show the selected agent's pane once the selection settles.
  schedule(cx) {
    const token = (this.token = (this.token ?? 0) + 1);
    cx.timer.after(SETTLE_MS, () => {
      if (token !== this.token || this.ended) return;
      const e = this.selected();
      if (!e?.a.pane || e.a.focused) return;
      this.moved = true;
      run("agent.focus", { terminal: e.a.address });
      // Showing the pane gives it the keyboard; keep typing in the filter.
      this.input.focus();
    });
  }

  // Agents with what we show and filter on.
  entries() {
    const term = new Map(terminals().map((x) => [x.address, x]));
    const spaceOf = new Map(spaces().map((s) => [s.id, s]));
    return agents().map((a) => {
      const x = term.get(a.address) ?? {};
      const s = spaceOf.get(a.space);
      const tab = s?.tabs.find((c) => c.id === a.tab);
      const machine = s?.machine ?? null;
      const name = a.title && a.title !== a.program?.name ? a.title : a.program?.name ?? a.address;
      return {
        a,
        name,
        machine,
        parent: x.parent ?? null,
        since: x.status_ms ?? tab?.changed_at ?? null,
        msg: x.report?.msg ?? x.status?.msg ?? "",
        where: `${a.space_name} / ${a.tab_name}`,
        text: [name, a.program?.name, a.space_name, a.tab_name, machine ?? "local", a.status, a.status === "blocked" ? "needs you" : ""]
          .join(" ")
          .toLowerCase(),
      };
    });
  }

  // The list: section headers and agent rows, filtered, most urgent and most recent first.
  rows() {
    const words = this.filter.toLowerCase().split(/\s+/).filter(Boolean);
    const all = this.entries();
    const match = (e) => words.every((w) => e.text.includes(w));
    const byAddr = new Map(all.map((e) => [e.a.address, e]));
    const kids = (e) => all.filter((k) => k.parent === e.a.address && match(k)).sort((x, y) => y.a.seq - x.a.seq);
    // Top level: agents whose parent isn't listed (a matching sub-agent of a hidden parent stands alone).
    const tops = all.filter((e) => (!e.parent || !byAddr.has(e.parent) || !match(byAddr.get(e.parent))) && match(e));
    const out = [];
    for (const [status, title] of SECTIONS) {
      const mine = tops.filter((e) => e.a.status === status).sort((x, y) => y.a.seq - x.a.seq);
      if (!mine.length) continue;
      out.push({ head: title, status, count: mine.length });
      for (const e of mine) {
        out.push({ e, depth: 0 });
        const walk = (p, d) => kids(p).forEach((k) => (out.push({ e: k, depth: d }), walk(k, d + 1)));
        walk(e, 1);
      }
    }
    return out;
  }

  selected() {
    const p = this.rows().filter((r) => r.e);
    return p[Math.min(this.at ?? 0, p.length - 1)]?.e ?? null;
  }

  glyph(t, st) {
    if (st === "working") return svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900);
    return div().w(12).flex_none().text_color(t[st] ?? t.dim).child(st === "idle" ? "○" : "●");
  }

  icon(t, p) {
    if (!p?.icon) return div().w(15).flex_none();
    return p.tint ? svg(p.icon).size(15).flex_none().text_color(p.color ?? t.muted) : image(p.icon).w(15).h(15).flex_none();
  }

  row(t, r, sel) {
    if (r.head) {
      return h_flex()
        .h(26)
        .px(14)
        .pb(4)
        .gap(8)
        .items_end()
        .text_size(11)
        .font_semibold()
        .text_color(r.status === "blocked" ? t.blocked : t.dim)
        .child(r.head)
        .child(div().text_color(t.dim).child(String(r.count)));
    }
    const e = r.e;
    const on = e === sel;
    return v_flex()
      .id(`af-${e.a.address}`)
      .mx(6)
      .pl(10 + r.depth * 18)
      .pr(10)
      .py(6)
      .gap(1)
      .rounded(7)
      .text_size(12.8)
      .cursor_pointer()
      .when(on, (el) => el.bg(t.selected ?? t.hover))
      .hover((s) => s.bg(t.hover))
      .on_click(() => this.stay(e))
      .child(
        h_flex()
          .gap(9)
          .items_center()
          .when(r.depth > 0, (el) => el.child(div().text_color(t.dim).child("└")))
          .child(this.glyph(t, e.a.status))
          .child(this.icon(t, e.a.program))
          .child(div().flex_1().min_w(0).truncate().text_color(on ? t.foreground : t.muted).when(on, (d) => d.font_semibold()).child(e.name))
          .when(Boolean(e.machine), (el) => el.child(div().flex_none().px(6).rounded(5).bg(t.raised).text_size(11).text_color(t.muted).child(`@${e.machine}`)))
          .when(!e.a.pane, (el) => el.child(div().flex_none().text_size(11).text_color(t.dim).child("no pane")))
          .child(div().flex_none().max_w(220).truncate().text_size(11.5).text_color(t.dim).child(e.where))
          .child(div().flex_none().w(30).text_size(11.5).text_color(t.dim).child(ago(e.since))),
      )
      .when(Boolean(e.msg), (el) =>
        el.child(div().pl(r.depth > 0 ? 64 : 46).truncate().text_size(11.5).text_color(e.a.status === "blocked" ? t.blocked : t.dim).child(e.msg)),
      );
  }

  render() {
    const t = theme();
    const rows = this.rows();
    const pick = rows.filter((r) => r.e);
    this.at = Math.max(0, Math.min(this.at ?? 0, pick.length - 1));
    const sel = pick[this.at]?.e ?? null;
    const offline = machines().filter((m) => m.name && m.layout === "unavailable").map((m) => m.name);

    return v_flex()
      .id("agent-finder")
      .on_key_down((ev, cx) => {
        const k = ev.key;
        const ctrl = ev.modifiers?.control;
        if (k === "escape") return this.cancel();
        if (k === "down" || (ctrl && (k === "n" || k === "j"))) this.move(1, cx);
        else if (k === "up" || (ctrl && (k === "p" || k === "k"))) this.move(-1, cx);
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .w_full()
      .min_h(0)
      .p(18)
      .gap(10)
      .bg(t.popover)
      .child(
        h_flex()
          .h(36)
          .flex_none()
          .px(10)
          .gap(10)
          .items_center()
          .rounded(9)
          .border_1()
          .border_color(t.accent)
          .bg(t.background)
          .child(svg("mods/workspace-chrome/search.svg").size(16).text_color(t.dim))
          .child(Input.new(this.input).flex_1().h_full().text_size(12.8).text_color(t.foreground))
          .when(offline.length > 0, (el) => el.child(div().text_size(11).text_color(t.blocked).child(`offline: ${offline.join(", ")}`)))
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
      .child(
        v_flex()
          .id("af-list")
          .max_h(320)
          .mb(6)
          .overflow_y_scrollbar()
          .when(rows.length === 0, (el) =>
            el.child(div().px(16).py(14).text_size(13).text_color(t.dim).child(this.filter ? "No agent matches." : "No agents running.")),
          )
          .children(rows.map((r) => this.row(t, r, sel))),
      );
  }
}
