// Agent Reader: an agent's conversation, easy to read, beside its real terminal.
//
// Two kinds of copy:
// - The float in layouts/mine.json (no props) renders nothing; it takes the key command
//   agent-reader.toggle (keys.json "layout:mine": alt-r). On an agent's terminal it opens a
//   reader pane next to it and zooms it; on a reader it closes it and gives the terminal back.
// - A reader pane (props { terminal }) reads that agent's session log (log.js) and shows it.
//   Its reply box sends to the agent with `hc send` (pasted, then Enter), as typing in the
//   terminal would. Esc with an empty reply box closes it too.
//
// Remove: delete this folder, the "agent-reader" floating block in mine.json, and alt-r in keys.json.

import { View, div } from "gpui-kit";
import { h_flex, v_flex, ScrollHandle, TextView, Textarea, TextareaState } from "gpui-base";
import { panes, props, run, theme, notify, nextCommand, watchFolder, checking, exec } from "herdr";
import { locate, parse, size, tail, TAIL_BYTES } from "./log.js";

const AGENTS = new Set(["claude-code", "pi"]);
const NAMES = { claude: "Claude Code", pi: "pi" };

export default class AgentReader extends View {
  init(p, cx) {
    this.terminal = p?.terminal ?? props()?.terminal ?? null;
    if (!this.terminal) return this.initFloat(cx);
    this.rows = [];
    this.open = new Set(); // expanded tool groups and tools, by key
    this.follow = true; // keep the latest message in view
    this.scroll = ScrollHandle.new();
    this.h = cx.focus_handle();
    this.draft = TextareaState.new({ placeholder: "Reply…   Enter sends · Shift-Enter for a new line" });
    this.draft.set_auto_grow(1, 8);
    this.draft.on("submit", (_e, cx) => this.send(cx));
    this.draft.focus();
    if (checking()) return;
    cx.spawn(async (cx) => this.watch(cx));
    cx.spawn(async (cx) => {
      for (;;) {
        if ((await nextCommand()) === "focus") this.draft.focus();
      }
    });
  }

  // The reply goes to the agent's terminal, pasted then Enter (hc waits for a draft typed there).
  send(cx) {
    const text = this.draft.value().trim();
    if (!text || this.sending) return;
    this.sending = true;
    this.sendError = null;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        const r = await exec("hc", ["send", this.terminal, text], { timeout: 120_000 });
        if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "hc send failed");
        this.draft.set_value("");
        this.follow = true;
      } catch (err) {
        const msg = String(err?.message ?? err);
        this.sendError = /block/i.test(msg) ? "It's waiting on a question or approval: answer it in the terminal (⌥R)." : msg;
      }
      this.sending = false;
      cx.notify();
    });
  }

  // ---- The float: the toggle key ----

  initFloat(cx) {
    this.float = true;
    this.opened = {}; // reader pane -> the terminal it reads
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        if ((await nextCommand()) === "toggle") this.toggle(cx);
      }
    });
  }

  toggle(cx) {
    const all = panes();
    const f = all.find((p) => p.focused);
    if (!f) return;
    if (f.mod === "agent-reader") return back(f.pane, this.opened[f.pane]);
    if (!f.terminal || !AGENTS.has(f.app)) {
      notify({ title: "No agent here", body: "Agent Reader reads Claude Code and pi.", level: "info", timeout: 2500 });
      return;
    }
    // This agent already has a reader in this tab: show it.
    const had = all.find((p) => p.mod === "agent-reader" && this.opened[p.pane] === f.terminal);
    if (had) {
      run("pane.focus", { pane: had.pane });
      if (!had.zoomed) run("pane.zoom", { pane: had.pane });
      return;
    }
    const before = new Set(all.map((p) => p.pane));
    run("pane.split", { pane: f.pane, direction: "right", mod: "agent-reader", props: { terminal: f.terminal } });
    cx.timer.after(60, () => {
      const made = panes().find((p) => !before.has(p.pane) && p.mod === "agent-reader");
      if (!made) return;
      this.opened[made.pane] = f.terminal;
      run("pane.zoom", { pane: made.pane });
    });
  }

  // ---- A reader pane ----

  async watch(cx) {
    let last = { path: null, size: -1 };
    for (;;) {
      try {
        const where = await locate(this.terminal);
        this.where = where;
        this.problem = null;
        const now = await size(where.path);
        if (where.path !== last.path || now !== last.size) {
          last = { path: where.path, size: now };
          const grew = this.rows.length;
          this.rows = parse(where.kind, await tail(where.path), now > TAIL_BYTES);
          if (this.follow && this.rows.length) this.scroll.scroll_to_item(this.blocks().length - 1);
          if (!grew) this.follow = true;
        }
      } catch (err) {
        this.problem = String(err?.message ?? err);
      }
      cx.notify();
      // Wait for the log's folder to change (other sessions there wake it too; size skips those).
      const dir = this.where?.path?.replace(/\/[^/]*$/, "");
      if (dir) {
        this.watching = watchFolder(dir);
        await this.watching;
      } else {
        await new Promise((ok) => cx.timer.after(3000, () => ok()));
      }
    }
  }

  close() {
    this.watching?.cancel?.();
  }

  // Rows as shown: each run of tool calls becomes one group.
  blocks() {
    const out = [];
    for (const r of this.rows) {
      const prev = out[out.length - 1];
      if (r.kind === "tool" && prev?.kind === "tools") prev.tools.push(r);
      else if (r.kind === "tool") out.push({ kind: "tools", key: `g-${r.key}`, tools: [r] });
      else out.push(r);
    }
    return out;
  }

  flip(key, cx) {
    if (this.open.has(key)) this.open.delete(key);
    else this.open.add(key);
    cx.notify();
  }

  render() {
    if (this.float) return div();
    const t = theme();
    const blocks = this.blocks();
    const status = panes().find((p) => p.terminal === this.terminal)?.status;
    return v_flex()
      .id("ar-root")
      .size_full()
      .bg(t.background)
      .track_focus(this.h)
      .on_key_down((e, cx) => {
        if (e.key === "escape" && !this.draft.value().trim()) back(null, this.terminal);
      })
      .child(this.bar(t, status))
      .child(
        div()
          .id("ar-scroll")
          .flex_1()
          .min_h(0)
          .overflow_y_scrollbar()
          .track_scroll(this.scroll)
          .on_scroll_wheel((e, cx) => {
            const dy = e.delta?.y ?? e.delta_y ?? 0;
            if (dy > 0 && this.follow) {
              this.follow = false;
              cx.notify();
            }
          })
          .children(blocks.map((b) => this.block(t, b)))
          .when(Boolean(this.problem) && !blocks.length, (el) =>
            el.child(div().p(24).text_color(t.muted).text_size(13).child(this.problem)),
          ),
      )
      .child(this.composer(t, status));
  }

  // The reply box, under the conversation in the same readable column.
  composer(t, status) {
    const busy = this.sending;
    return h_flex()
      .flex_none()
      .w_full()
      .justify_center()
      .px(24)
      .pt(8)
      .pb(14)
      .child(
        v_flex()
          .w_full()
          .max_w(860)
          .gap(6)
          .when(Boolean(this.sendError), (el) => el.child(div().text_size(12).text_color(t.blocked).child(this.sendError)))
          .when(status === "blocked" && !this.sendError, (el) =>
            el.child(div().text_size(12).text_color(t.blocked).child("It's waiting on you in the terminal (⌥R) — a question or an approval.")),
          )
          .child(
            h_flex()
              .id("ar-compose")
              .w_full()
              .gap(8)
              .px(12)
              .py(8)
              .items_end()
              .rounded(12)
              .border_1()
              .border_color(t.input)
              .bg(t.surface)
              // Enter sends; Shift-Enter is the textarea's own new line.
              .on_key_down((e, cx) => {
                if (e.keystroke === "enter") {
                  this.send(cx);
                  cx.stop_propagation();
                }
              })
              .child(Textarea.new(this.draft).flex_1().min_w(0).text_size(14).text_color(t.foreground))
              .child(
                div()
                  .id("ar-send")
                  .flex_none()
                  .px(12)
                  .h(26)
                  .flex()
                  .items_center()
                  .rounded(9)
                  .text_size(12)
                  .cursor_pointer()
                  .bg(busy ? t.raised : t.accent)
                  .text_color(busy ? t.muted : t.accent_foreground)
                  .on_click((_e, cx) => this.send(cx))
                  .child(busy ? "Sending…" : "Send"),
              ),
          ),
      );
  }

  // The reader's own strip: which agent, live state, the way back.
  bar(t, status) {
    const w = this.where;
    return h_flex()
      .flex_none()
      .h(34)
      .px(16)
      .gap(10)
      .items_center()
      .border_b_1()
      .border_color(t.border)
      .text_size(12)
      .child(div().text_color(t.foreground).font_semibold().child(w ? NAMES[w.kind] : "Agent Reader"))
      .when(Boolean(w?.title), (el) => el.child(div().text_color(t.muted).truncate().child(w.title)))
      .when(Boolean(status), (el) =>
        el.child(
          h_flex()
            .gap(6)
            .items_center()
            .text_color(t.muted)
            .child(
              status === "working"
                ? div().w(7).h(7).rounded_full().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 1200 })
                : div().w(7).h(7).rounded_full().bg(t[status] ?? t.idle),
            )
            .child(status === "blocked" ? "needs you" : status),
        ),
      )
      .child(div().flex_1())
      .when(!this.follow, (el) =>
        el.child(
          pill(t, "ar-latest", "Latest ↓", (_e, cx) => {
            this.follow = true;
            this.scroll.scroll_to_item(this.blocks().length - 1);
            cx.notify();
          }),
        ),
      )
      .child(pill(t, "ar-term", "Terminal  ⌥R", () => back(null, this.terminal)));
  }

  block(t, b) {
    // A readable column, centered in wide panes.
    const column = (el) => h_flex().w_full().justify_center().px(24).child(div().w_full().max_w(860).child(el));
    if (b.kind === "user")
      return column(
        div()
          .mt(18)
          .mb(6)
          .px(14)
          .py(10)
          .rounded(10)
          .bg(t.raised)
          .border_l_2()
          .border_color(t.accent)
          .text_size(14)
          .child(TextView.markdown(`ar-${b.key}`, b.text).selectable(true)),
      );
    if (b.kind === "text")
      return column(div().py(8).text_size(14).child(TextView.markdown(`ar-${b.key}`, b.text).selectable(true)));
    if (b.kind === "note")
      return column(div().py(6).text_size(11.5).text_color(t.dim).child(`— ${b.text} —`));
    return column(this.toolGroup(t, b));
  }

  // A run of tool calls: one line ("▸ 7 steps · Bash, Read, Edit"); open, a line per call.
  toolGroup(t, g) {
    const open = this.open.has(g.key);
    const names = [...new Set(g.tools.map((x) => x.name))].slice(0, 4).join(", ");
    const failed = g.tools.some((x) => x.error);
    const line = h_flex()
      .id(g.key)
      .gap(8)
      .py(4)
      .items_center()
      .cursor_pointer()
      .text_size(12)
      .text_color(t.muted)
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => this.flip(g.key, cx))
      .child(div().w(10).child(open ? "▾" : "▸"))
      .child(g.tools.length === 1 ? `${g.tools[0].name} · ${g.tools[0].summary}` : `${g.tools.length} steps · ${names}`)
      .when(failed, (el) => el.child(div().text_color(t.blocked).child("· failed")));
    return v_flex()
      .py(2)
      .child(line)
      .when(open, (el) => el.children(g.tools.map((x) => this.tool(t, x))));
  }

  tool(t, x) {
    const open = this.open.has(x.key);
    const detail = [x.input?.command ? `$ ${x.input.command}` : "", x.result ?? ""].filter(Boolean).join("\n\n");
    const shown = detail.split("\n").slice(0, 40).join("\n");
    return v_flex()
      .ml(18)
      .child(
        h_flex()
          .id(`t-${x.key}`)
          .gap(8)
          .py(3)
          .cursor_pointer()
          .text_size(12)
          .text_color(x.error ? t.blocked : t.dim)
          .hover((s) => s.text_color(t.foreground))
          .on_click((_e, cx) => this.flip(x.key, cx))
          .child(div().flex_none().font_semibold().child(x.name))
          .child(div().min_w(0).truncate().child(x.summary)),
      )
      .when(open && Boolean(shown), (el) =>
        el.child(
          div()
            .mt(2)
            .mb(6)
            .px(12)
            .py(8)
            .rounded(8)
            .bg(t.surface)
            .text_size(12)
            .child(TextView.markdown(`tr-${x.key}`, "```\n" + shown.replace(/```/g, "ˋˋˋ") + "\n```").selectable(true)),
        ),
      );
  }
}

// Close a reader and give its terminal the keyboard. pane null: the focused one.
function back(pane, terminal) {
  run("pane.close", pane ? { pane } : {});
  if (terminal) run("pane.focus", { terminal });
}

function pill(t, id, label, onClick) {
  return div()
    .id(id)
    .px(10)
    .h(22)
    .flex()
    .items_center()
    .rounded(11)
    .bg(t.raised)
    .text_color(t.muted)
    .cursor_pointer()
    .hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_click(onClick)
    .child(label);
}
