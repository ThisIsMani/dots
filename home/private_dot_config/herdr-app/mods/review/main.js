// Review: a GitHub-style code review panel. Pull requests (via gh) or local changes;
// file tree, unified/split diff with syntax highlighting, line and range comments,
// suggestions, threads (reply, resolve), viewed files and a pending review.
//
// The diff draws only the rows on screen with its own scroll position, so rows keep
// their mouse handlers (drag to select lines) and the keyboard can scroll to a line.
import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, TextareaState, Textarea, TextView } from "gpui-base";
import { spaces, panes, focused, agents, knownAgents, hc, run, theme, settings, props, notify, nextCommand, watchFolder } from "herdr";
import * as ag from "./agent.js";
import { lexLines, langFor, lexLine } from "./lex.js";
import { buildRows, lineKey, keyOf, diffHash, sideSequences } from "./diff.js";
import * as src from "./source.js";

const MOD = "review";
const ICON = (n) => `mods/review/icons/${n}.svg`;
const LH = 20, GAP_H = 30, TREE_ROW = 26, CODE_SIZE = 12;
const EXPAND_STEP = 20;
const GENERATED = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|flake\.lock|go\.sum|poetry\.lock|uv\.lock|composer\.lock|Gemfile\.lock|Podfile\.lock|[^/]*\.min\.(js|css)|[^/]*\.snap|[^/]*\.map)$/;
const BIG_DIFF = 3000; // changed lines before a file waits for "Load diff"
const BIG_LEX = 30000; // lines per side we highlight and expand from
const PR_POLL_MS = 60000;
const HELP = [
  ["j / k", "Next / previous line"], ["h / l", "Left / right a character (crosses sides in split)"], ["w / b / e", "Word forward / back / end"],
  ["0 / ^ / $", "Line start / first non-blank / end"], ["v", "Visual mode: j / k extend, v or esc leaves"],
  ["shift-j / shift-k", "Next / previous file"], ["N", "Next unviewed file"], ["] / [", "Next / previous change"],
  ["c or enter", "Comment on the line or selection"], ["s", "Suggest a change"], ["drag the line numbers", "Select lines to comment on"],
  ["a", "Ask the agent about the line or selection"], ["shift-a", "Ask the agent about this file"], ["agent button", "Ask anything, or have it review"],
  ["x", "Mark viewed, go to the next"], ["shift-e", "Expand all context"], ["u", "Unified / split"], ["t", "Show / hide files"],
  ["o", "Open the line in Neovim"], ["f", "Neovim follows the cursor on / off"],
  ["/", "Filter files"], ["y", "Copy the selected lines"], ["space / shift-space", "Page down / up"], ["gg / G", "Top / bottom"],
  ["shift-r", "Finish your review"], ["r", "Refresh"], ["shift-o", "Open in browser"], ["⌘↵", "Save / send"], ["esc", "Cancel / clear"],
]

const ago = (iso) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  for (const [n, u] of [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]]) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "";
};
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const a = (c, alpha) => (typeof c === "string" && c.length === 7 ? c + alpha : c);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Display column (tabs to 4) ↔ UTF-8 byte offset in a raw line, for Neovim's cursor.
function byteOffset(raw, col) {
  let d = 0, b = 0;
  for (const ch of raw) {
    if (d >= col) break;
    d += ch === "\t" ? 4 - (d % 4) : 1;
    const c = ch.codePointAt(0);
    b += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return b;
}
function displayCol(raw, byte) {
  let d = 0, b = 0;
  for (const ch of raw) {
    if (b >= byte) break;
    d += ch === "\t" ? 4 - (d % 4) : 1;
    const c = ch.codePointAt(0);
    b += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return d;
}

// Which pane each copy is, so a second Review never mistakes another's pane for its own.
const CLAIMED = new Set();
const hueOf = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export default class Review extends View {
  init(_props, cx) {
    this.h = cx.focus_handle();
    this.stage = "locating";
    const pref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
    this.split = pref("split", false);
    this.treeOpen = pref("tree", true);
    this.treeW = pref("treeW", 280);
    this.typing = null;
    this.items = []; this.offsets = [0]; this.heights = {};
    this.scrollY = 0; this.scrollX = 0; this.viewW = 800; this.viewH = 600;
    this.treeY = 0; this.treeH = 400;
    this.cache = new Map(); this.expanded = {}; this.collapsedDirs = new Set();
    this.openThreads = new Set(); this.loadBig = new Set();
    this.threads = []; this.state = { drafts: [], viewed: {}, body: "" };
    this.cursor = -1; this.side = "RIGHT"; this.sel = null;
    this.col = 0; this.wantCol = 0; // the cursor's column (display columns, tabs expanded); wantCol survives short lines
    this.pickSel = 0; this.pickFilter = ""; this.fileFilter = "";
    // The workspace beside the review: { agent: {key, name, run}, agentTerm, nvimTerm, sock, dir, gitDir, briefedFor }.
    // Herdr keeps one store per set of props, so only a pane with its own props (an `id`, given
    // when a review is picked) remembers its review and workspace. A bare Review tab starts fresh.
    this.own = Boolean(props()?.id || props()?.pr || props()?.mode);
    this.ws = this.own ? pref("ws", null) : null;
    this.wsDone = this.own ? pref("wsDone", false) : false;
    this.agentChoice = pref("agentChoice", null);
    this.follow = pref("follow", true);
    this.known = null;

    this.pickInput = InputState.new({ placeholder: "Filter pull requests, or type a PR number, URL or git ref" });
    this.pickInput.on("change", (_e, cx) => { this.pickFilter = this.pickInput.value(); this.pickSel = 0; cx.notify(); });
    this.pickInput.on("submit", (_e, cx) => this.pickEnter(cx));
    this.track(this.pickInput, "pick");
    this.treeInput = InputState.new({ placeholder: "Filter files…" });
    this.treeInput.on("change", (_e, cx) => { this.fileFilter = this.treeInput.value(); this.treeY = 0; this.buildTree(); cx.notify(); });
    this.treeInput.on("submit", (_e, cx) => { const f = this.order[0]; if (f) this.selectFile(f, cx); this.h.focus(); });
    this.track(this.treeInput, "tree");

    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "focus") this.h.focus();
        else this.command(c, cx);
        cx.notify();
      }
    });
    cx.timer.every(120, (cx) => this.claimFocus(cx));
    cx.timer.every(1500, (cx) => this.pollInbox(cx));
    cx.timer.every(300, (cx) => this.syncNvim(cx));
    cx.timer.every(2000, (cx) => { if (this.needSave && this.review) { this.needSave = false; this.saveState(cx); } });
    cx.timer.every(PR_POLL_MS, (cx) => { if (this.stage === "review" && this.review?.kind === "pr" && !this.busy) this.refreshThreads(cx, true); });
    this.locate(cx);
  }

  async close() {
    for (const s of [this.composer?.state, this.replying?.state, this.submit?.state]) try { s?.release(); } catch {}
  }

  // Remembers which text field has the keyboard, so plain keys go to it and not to the review.
  // Herdr focuses the pane, not the mod inside it (only pane.go sends "focus"), so take the
  // keyboard when this pane becomes the focused one. Once per arrival, so a click elsewhere
  // in the pane or a text field keeps it.
  claimFocus(cx) {
    const mine = this.paneId ?? this.myPane()?.pane;
    const here = Boolean(mine && focused()?.pane === mine);
    if (here && !this.wasHere && !this.typing) {
      try { this.h.focus(); } catch {}
      cx.notify();
    }
    if (here !== this.wasHere && !here) cx.notify(); // the cursor dims when we lose it
    this.wasHere = here;
  }

  track(state, name) {
    state.on("focus", (_e, cx) => { this.typing = name; cx.notify(); });
    state.on("blur", (_e, cx) => { if (this.typing === name) this.typing = null; cx.notify(); });
  }

  savePref(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  // Per-review state: only in a pane's own store.
  saveOwn(k, v) { if (this.own) this.savePref(k, v); }

  // ---- where we are -------------------------------------------------------------------

  myPane() {
    if (this.paneId === undefined) try { this.paneId = this.own ? localStorage.getItem("pane") : null; } catch {}
    const id = props()?.pane ?? this.paneId;
    let p = id && panes().find((x) => x.pane === id);
    if (!p) {
      const tab = focused()?.tab;
      const free = panes().filter((x) => x.mod === MOD && !CLAIMED.has(x.pane));
      p = free.find((x) => x.tab === tab) ?? (free.length === 1 ? free[0] : null);
      if (p) {
        this.paneId = p.pane;
        CLAIMED.add(p.pane);
        if (this.own) try { localStorage.setItem("pane", p.pane); } catch {}
      }
    } else CLAIMED.add(p.pane);
    return p ?? null;
  }
  mySpace() {
    const mine = this.myPane();
    return spaces().find((s) => mine && s.tabs.some((t) => t.id === mine.tab)) ?? spaces().find((s) => s.active);
  }

  locate(cx) {
    cx.spawn(async (cx) => {
      const space = this.mySpace();
      const tabs = new Set(space?.tabs.map((t) => t.id));
      const p = props() ?? {};
      const dirs = [...new Set([p.folder, ...panes().filter((x) => tabs.has(x.tab) && x.cwd).map((x) => x.cwd), space?.folder].filter(Boolean))];
      this.repo = await src.findRepo(dirs, space?.machine ?? null);
      if (!this.repo) { this.fail("No git repository here. Open Review from a space whose terminals are in a repo."); cx.notify(); return; }
      // This pane's last review (it may have changed since its props were given), else its props.
      let target = null;
      if (this.own) try { target = JSON.parse(localStorage.getItem("target") ?? "null"); } catch {}
      if (!target) target = p.pr ? { kind: "pr", number: Number(p.pr) } : p.mode ? { kind: "local", mode: p.mode, base: p.base } : null;
      if (target && p.agent !== undefined && !this.ws && !this.wsDone) {
        // Opened for a review with an agent (props): set the workspace up as the picker would.
        const known = await knownAgents({ on: this.repo.on }).catch(() => []);
        this.wantAgent = known.find((x) => x.key === p.agent && x.installed) ?? null;
        this.wantWorkspace = true;
      }
      if (target) this.open(target, cx);
      else this.showPicker(cx);
      cx.notify();
    });
  }

  fail(message) { this.stage = "error"; this.error = message; }

  // ---- picker -------------------------------------------------------------------------

  showPicker(cx) {
    this.stage = "pick"; this.pickSel = 0; this.prs = null; this.prError = null;
    cx.spawn(async (cx) => {
      try { this.local = await src.localInfo(this.repo); } catch (e) { this.local = null; }
      cx.notify();
    });
    cx.spawn(async (cx) => {
      try { this.prs = await src.listPrs(this.repo); }
      catch (e) { this.prs = []; this.prError = String(e.message ?? e); }
      cx.notify();
    });
    cx.spawn(async (cx) => {
      try { this.known = (await knownAgents({ on: this.repo.on })).filter((x) => x.installed); } catch { this.known = []; }
      if (this.agentChoice && this.agentChoice !== "none" && !this.known.some((x) => x.key === this.agentChoice)) this.agentChoice = null;
      if (!this.agentChoice) this.agentChoice = this.known[0]?.key ?? "none";
      cx.notify();
    });
    cx.spawn(async () => { await cx.sleep(50); try { this.pickInput.focus(); } catch {} });
  }

  pickEntries() {
    const q = this.pickFilter.trim().toLowerCase();
    const out = [];
    const l = this.local;
    out.push({ id: "uncommitted", target: { kind: "local", mode: "uncommitted" }, title: "Uncommitted changes", meta: l ? plural(l.dirty, "changed file") : "", section: "This checkout" });
    if (l?.base) out.push({ id: "base", target: { kind: "local", mode: "base", base: l.base }, title: `${l.branch ?? "HEAD"} vs ${l.base}`, meta: "branch commits + uncommitted", section: "This checkout" });
    for (const p of this.prs ?? []) out.push({ id: `pr${p.number}`, target: { kind: "pr", number: p.number }, pr: p, title: p.title, section: "Pull requests" });
    const m = /(?:^#?|pull\/)(\d+)\/?$/.exec(q);
    let list = q ? out.filter((e) => `${e.title} ${e.pr ? `#${e.pr.number} ${e.pr.author?.login} ${e.pr.headRefName}` : ""}`.toLowerCase().includes(q.replace(/^#/, ""))) : out;
    if (m && !list.some((e) => e.pr?.number === Number(m[1]))) list = [{ id: `pr${m[1]}`, target: { kind: "pr", number: Number(m[1]) }, title: `Pull request #${m[1]}`, meta: "open by number", section: "Pull requests" }, ...list];
    if (q && !m && /^[\w./~^@{}-]+$/.test(q)) list.push({ id: `ref:${q}`, target: { kind: "local", mode: "base", base: this.pickFilter.trim() }, title: `Compare against ${this.pickFilter.trim()}`, meta: "any branch, tag or commit", section: "Compare" });
    return list;
  }

  pickEnter(cx) {
    const list = this.pickEntries();
    const e = list[clamp(this.pickSel, 0, list.length - 1)];
    if (e) this.choose(e.target, cx);
  }

  // Tab / shift-tab in the picker: the next or previous agent (None last).
  cycleAgent(delta, cx) {
    const keys = [...(this.known ?? []).map((x) => x.key), "none"];
    const i = keys.indexOf(this.agentChoice);
    this.agentChoice = keys[(Math.max(0, i) + delta + keys.length) % keys.length];
    this.savePref("agentChoice", this.agentChoice);
    cx.stop_propagation(); cx.notify();
  }

  // From the picker: the review, and the agent picked for it.
  choose(target, cx) {
    this.savePref("agentChoice", this.agentChoice);
    if (!this.own) return this.respawn(target, cx);
    this.wantAgent = this.agentChoice === "none" ? null : this.known?.find((x) => x.key === this.agentChoice) ?? null;
    this.wantWorkspace = true;
    this.open(target, cx);
  }

  // ---- loading ------------------------------------------------------------------------

  open(target, cx, { quiet = false } = {}) {
    const keep = quiet && this.review ? { path: this.path, scrollY: this.scrollY } : null;
    if (!quiet) { this.stage = "loading"; this.loadingText = target.kind === "pr" ? `Loading pull request #${target.number}…` : "Loading changes…"; }
    this.target = target;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const review = target.kind === "pr" ? await src.loadPr(this.repo, target.number) : await src.loadLocal(this.repo, target.mode, target.base);
        const threads = review.kind === "pr" ? await src.loadThreads(this.repo, review.slug, review.pr.number) : [];
        const sameReview = this.review?.key === review.key;
        if (!sameReview) {
          this.state = await this.loadState(review.key);
          this.cache = new Map(); this.expanded = {}; this.heights = {}; this.composer = null; this.replying = null; this.submit = null;
        } else {
          // Keep highlighted contents only for files whose diff didn't change.
          const hashes = new Map(this.review.files.map((f) => [f.path, diffHash(f)]));
          for (const f of review.files) if (hashes.get(f.path) !== diffHash(f)) this.cache.delete(f.path);
        }
        this.review = review; this.threads = threads;
        this.fileMap = new Map(review.files.map((f) => [f.path, f]));
        this.saveOwn("target", target);
        this.buildTree();
        this.stage = "review";
        const last = keep?.path ?? (() => { try { return localStorage.getItem(`last:${review.key}`); } catch { return null; } })();
        const path = this.fileMap.has(last) ? last : this.order[0] ?? null;
        if (keep && path === keep.path) { this.rebuild(); this.scrollY = keep.scrollY; this.clampScroll(); this.loadContents(path, cx); }
        else this.selectFile(path, cx);
        this.nameTab();
        this.setupWorkspace(cx);
        if (review.kind === "local") this.watch(cx);
      } catch (e) {
        if (quiet) notify({ title: "Review: refresh failed", body: String(e.message ?? e), level: "error" });
        else { this.fail(String(e.message ?? e)); }
      } finally { this.busy = false; cx.notify(); }
    });
  }

  reload(cx, quiet = true) { if (this.target && !this.busy) this.open(this.target, cx, { quiet }); }

  nameTab() {
    const pane = this.myPane();
    if (!pane) return;
    const tab = spaces().flatMap((s) => s.tabs).find((t) => t.id === pane.tab);
    if (!tab || tab.panes !== 1) return;
    const r = this.review;
    const name = r.kind === "pr" ? `Review #${r.pr.number}` : r.mode === "uncommitted" ? "Review: uncommitted" : `Review: ${r.title}`;
    if (tab.name !== name) run("tab.rename", { id: tab.id, name });
  }

  watch(cx) {
    if (this.repo.on || this.watching === this.repo.root) return;
    const root = this.watching = this.repo.root;
    cx.spawn(async (cx) => {
      try {
        while (this.watching === root && this.review?.kind === "local") {
          const changed = await watchFolder(root);
          if (changed.every((p) => /\/\.git\/(objects|herdr-review|logs|FETCH_HEAD|ORIG_HEAD)/.test(p) || /\/\.git\/.*\.lock$/.test(p))) continue;
          await cx.sleep(500);
          if (this.watching === root && this.review?.kind === "local") this.reload(cx);
        }
      } catch { this.watching = null; }
    });
  }

  refreshThreads(cx, quiet = false) {
    const r = this.review;
    if (r?.kind !== "pr") return;
    cx.spawn(async (cx) => {
      try { this.threads = await src.loadThreads(this.repo, r.slug, r.pr.number); this.rebuild(); }
      catch (e) { if (!quiet) notify({ title: "Review: couldn't load comments", body: String(e.message ?? e), level: "error" }); }
      cx.notify();
    });
  }

  statePath(key) { return `${this.repo.stateDir()}/${key}.json`; }
  async loadState(key) {
    const text = await this.repo.readFile(this.statePath(key));
    try { const s = JSON.parse(text ?? "{}"); return { drafts: s.drafts ?? [], viewed: s.viewed ?? {}, body: s.body ?? "" }; }
    catch { return { drafts: [], viewed: {}, body: "" }; }
  }
  saveState(cx) {
    const path = this.statePath(this.review.key), text = JSON.stringify(this.state, null, 1);
    cx.spawn(async () => {
      try { await this.repo.writeFile(path, text); }
      catch (e) { notify({ title: "Review: couldn't save your comments", body: String(e.message ?? e), level: "error" }); }
    });
  }

  // ---- files --------------------------------------------------------------------------

  isViewed(f) {
    if (!f) return false;
    return this.review.kind === "pr" ? Boolean(this.review.viewed[f.path]) : this.state.viewed[f.path] === diffHash(f);
  }

  commentCount(path) {
    const t = this.threads.filter((x) => x.path === path && !x.resolved).length;
    const d = this.state.drafts.filter((x) => x.path === path).length;
    return { t, d };
  }

  buildTree() {
    const q = this.fileFilter.trim().toLowerCase();
    const files = this.review.files.filter((f) => !q || f.path.toLowerCase().includes(q));
    const root = { dirs: new Map(), files: [] };
    for (const f of files) {
      const parts = f.path.split("/");
      let node = root;
      for (const p of parts.slice(0, -1)) {
        if (!node.dirs.has(p)) node.dirs.set(p, { dirs: new Map(), files: [] });
        node = node.dirs.get(p);
      }
      node.files.push(f);
    }
    const rows = [], order = [];
    const walk = (node, depth, prefix) => {
      for (const [name0, child0] of [...node.dirs].sort((x, y) => x[0].localeCompare(y[0]))) {
        // Folders with one folder in them show as one row: "src/core/api".
        let name = name0, child = child0;
        while (child.files.length === 0 && child.dirs.size === 1) {
          const [[n, c]] = [...child.dirs];
          name += "/" + n; child = c;
        }
        const path = prefix + name;
        const open = !this.collapsedDirs.has(path) || Boolean(q);
        rows.push({ type: "dir", path, name, depth, open });
        if (open) walk(child, depth + 1, path + "/");
        else collect(child, order);
      }
      for (const f of node.files.sort((x, y) => x.path.localeCompare(y.path))) {
        rows.push({ type: "file", file: f, depth });
        order.push(f.path);
      }
    };
    const collect = (node, out) => {
      for (const [, c] of [...node.dirs].sort((x, y) => x[0].localeCompare(y[0]))) collect(c, out);
      for (const f of node.files.sort((x, y) => x.path.localeCompare(y.path))) out.push(f.path);
    };
    walk(root, 0, "");
    this.treeRows = rows;
    this.order = order;
  }

  // Tree order, collapsed folders included, so n / p go through every file.
  fileOrder() { return this.order; }

  selectFile(path, cx) {
    this.path = path;
    this.scrollY = 0; this.scrollX = 0; this.sel = null; this.cursor = -1;
    if (!path) { this.items = []; this.layout(); return; }
    if (this.own) try { localStorage.setItem(`last:${this.review.key}`, path); } catch {}
    // Open the folders above it and bring it into the tree's view.
    let changed = false;
    for (const d of [...this.collapsedDirs]) if (path.startsWith(d + "/")) { this.collapsedDirs.delete(d); changed = true; }
    if (changed) this.buildTree();
    const i = this.treeRows.findIndex((r) => r.type === "file" && r.file.path === path);
    if (i >= 0) {
      const top = i * TREE_ROW;
      if (top < this.treeY) this.treeY = top;
      else if (top + TREE_ROW > this.treeY + this.treeH) this.treeY = top + TREE_ROW - this.treeH;
    }
    this.rebuild();
    this.cursor = this.items.findIndex((it) => it.row && (it.row.kind === "+" || it.row.kind === "-" || it.row.left?.kind === "-" || it.row.right?.kind === "+"));
    if (this.cursor < 0) this.cursor = this.items.findIndex((it) => it.type === "line" || it.type === "pair");
    this.side = this.split && this.items[this.cursor]?.row?.right == null && this.items[this.cursor]?.row?.left ? "LEFT" : "RIGHT";
    this.loadContents(path, cx);
    cx.notify();
  }

  stepFile(delta, cx, unviewed = false) {
    const order = this.fileOrder();
    if (!order.length) return;
    let i = order.indexOf(this.path);
    for (let n = 0; n < order.length; n++) {
      i = (i + delta + order.length) % order.length;
      if (!unviewed || !this.isViewed(this.fileMap.get(order[i]))) return this.selectFile(order[i], cx);
    }
    if (unviewed) notify({ title: "Every file is viewed", level: "success", timeout: 2500 });
  }

  bigFile(f) {
    return !this.loadBig.has(f.path) && (GENERATED.test(f.path) || f.add + f.del > BIG_DIFF);
  }

  // Both sides' whole contents: real highlighting, and context to expand into.
  loadContents(path, cx) {
    const f = this.fileMap.get(path);
    if (!f || this.cache.has(path) || f.binary || this.bigFile(f) || !f.hunks.length) return;
    const entry = { loading: true };
    this.cache.set(path, entry);
    const review = this.review;
    cx.spawn(async (cx) => {
      try {
        const [oldLines, newLines] = await Promise.all([src.fileLines(this.repo, review, f, "LEFT"), src.fileLines(this.repo, review, f, "RIGHT")]);
        if (this.review !== review) return;
        const ok = (l) => l && l.length <= BIG_LEX;
        entry.oldLines = ok(oldLines) ? oldLines : null;
        entry.newLines = ok(newLines) ? newLines : null;
        entry.oldTok = entry.oldLines ? lexLines(f.oldPath ?? f.path, entry.oldLines) : null;
        entry.newTok = entry.newLines ? lexLines(f.path, entry.newLines) : null;
      } catch {}
      entry.loading = false;
      if (this.path === path) { this.rebuild(); cx.notify(); }
    });
  }

  // Highlighting from the diff alone, while (or when) the files aren't there.
  seqTokens(f) {
    if (f._seq) return f._seq;
    const { oldS, newS } = sideSequences(f);
    const lex = (path, map) => {
      const lang = langFor(path), out = [];
      let st = {};
      for (const n of [...map.keys()].sort((x, y) => x - y)) { const r = lexLine(lang, map.get(n).replace(/\t/g, "    "), st); st = r.state; out[n - 1] = r.tokens; }
      return out;
    };
    return (f._seq = { oldTok: lex(f.oldPath ?? f.path, oldS), newTok: lex(f.path, newS) });
  }

  // The text of one line of the diff (or the whole file, for local reviews).
  lineText(f, side, line) {
    if (!f._maps) {
      const L = new Map(), R = new Map();
      for (const h of f.hunks) for (const l of h.lines) { if (l.old != null) L.set(l.old, l); if (l.new != null) R.set(l.new, l); }
      f._maps = { L, R };
    }
    const l = (side === "LEFT" ? f._maps.L : f._maps.R).get(line);
    if (l) return l.raw;
    if (this.review.kind === "local") {
      const c = this.cache.get(f.path);
      const lines = side === "LEFT" ? c?.oldLines : c?.newLines;
      return lines?.[line - 1] ?? null;
    }
    return null;
  }

  // A draft still points at the code it was written on; follow it if lines moved.
  verify(d) {
    const f = this.fileMap.get(d.path);
    if (!f) return false;
    const snip = d.snippet ?? [];
    if (!snip.length) return this.lineText(f, d.side, d.line) != null;
    if (snip.every((s) => this.lineText(f, s.side, s.line) === s.raw)) return true;
    const s0 = snip[0];
    const map = s0.side === "LEFT" ? f._maps.L : f._maps.R;
    for (const [n, l] of map) {
      if (l.raw !== s0.raw) continue;
      const delta = n - s0.line;
      if (snip.every((s) => this.lineText(f, s.side, s.line + delta) === s.raw)) {
        d.line += delta; if (d.startLine != null) d.startLine += delta;
        for (const s of snip) s.line += delta;
        d.moved = true;
        return true;
      }
    }
    return false;
  }

  // ---- the diff's items ---------------------------------------------------------------

  rebuild() {
    const f = this.fileMap?.get(this.path);
    this.items = [];
    if (!f) { this.layout(); return; }
    const c = this.cache.get(f.path) ?? {};
    const seq = c.oldTok && c.newTok ? null : this.seqTokens(f);
    const ctx = {
      oldLines: c.oldLines ?? null, newLines: c.newLines ?? null,
      oldTok: c.oldTok ?? seq?.oldTok, newTok: c.newTok ?? seq?.newTok,
      expanded: (this.expanded[f.path] ??= {}),
    };
    const items = this.items;
    // Threads and drafts by the line they end on; the rest go above the diff.
    const at = new Map(), above = [];
    const put = (k, it) => { if (!at.has(k)) at.set(k, []); at.get(k).push(it); };
    for (const t of this.threads) {
      if (t.path !== f.path) continue;
      if (t.outdated || t.file || t.line == null) above.push({ type: "thread", thread: t, key: `t:${t.id}` });
      else put(keyOf(t.side, t.line), { type: "thread", thread: t, key: `t:${t.id}` });
    }
    let moved = false;
    for (const d of this.state.drafts) {
      if (d.path !== f.path) continue;
      const ok = this.verify(d);
      if (d.moved) { moved = true; delete d.moved; }
      d.outdated = !ok;
      if (this.composer?.editing === d.id) continue;
      if (ok) put(keyOf(d.side, d.line), { type: "draft", draft: d, key: `d:${d.id}` });
      else above.push({ type: "draft", draft: d, key: `d:${d.id}` });
    }
    if (moved) this.needSave = true;
    const composerKey = this.composer?.path === f.path ? keyOf(this.composer.side, this.composer.line) : null;
    if (above.length) {
      items.push({ type: "above", key: "above", n: above.length });
      if (this.aboveOpen) for (const it of above) items.push(it);
    }
    if (f.binary) items.push({ type: "note", key: "note", text: "Binary file not shown." });
    else if (!f.hunks.length) items.push({ type: "note", key: "note", text: f.status === "A" ? "Empty file." : f.status === "D" ? "Deleted an empty file." : f.status === "R" ? `Renamed without changes from ${f.oldPath}.` : f.mode ? `File mode changed: ${f.mode}.` : "No changes to show." });
    else if (this.bigFile(f)) items.push({ type: "load", key: "load", text: GENERATED.test(f.path) ? "Generated or lock file, not rendered by default." : `Large diff (${f.add + f.del} changed lines), not rendered by default.` });
    else {
      const rows = buildRows(f, ctx, this.split);
      this.maxCols = 0;
      const placed = new Set();
      for (const r of rows) {
        items.push({ type: r.type, row: r, key: null });
        if (r.type === "line") this.maxCols = Math.max(this.maxCols, r.text.length);
        if (r.type === "pair") this.maxCols = Math.max(this.maxCols, r.left?.text.length ?? 0, r.right?.text.length ?? 0);
        const keys = r.type === "line" ? (r.kind === " " ? [keyOf("RIGHT", r.new), keyOf("LEFT", r.old)] : [lineKey(r)])
          : r.type === "pair" ? [r.left && keyOf("LEFT", r.left.old), r.right && keyOf("RIGHT", r.right.new)].filter(Boolean) : [];
        for (const k of keys) {
          if (placed.has(k)) continue;
          placed.add(k);
          for (const it of at.get(k) ?? []) items.push(it);
          if (k === composerKey) items.push({ type: "composer", key: "composer" });
        }
      }
      // Anything whose line isn't drawn (in folded context) still shows, above.
      const lost = [...at].filter(([k]) => !placed.has(k)).flatMap(([, v]) => v);
      if (lost.length) {
        const i = items.findIndex((x) => x.type === "above");
        if (i < 0) items.unshift({ type: "above", key: "above", n: lost.length }, ...(this.aboveOpen ? lost : []));
        else { items[i].n += lost.length; if (this.aboveOpen) items.splice(i + 1, 0, ...lost); }
      }
      if (composerKey && !placed.has(composerKey)) items.unshift({ type: "composer", key: "composer" });
    }
    items.forEach((it, i) => { if (!it.key) it.key = `r${i}`; });
    const maxLine = Math.max(1, ...f.hunks.map((h) => Math.max(h.oldStart + h.oldLines, h.newStart + h.newLines)), c.newLines?.length ?? 0, c.oldLines?.length ?? 0);
    this.gutterW = Math.max(3, String(maxLine).length) * this.charW() + 18;
    this.layout();
  }

  charW() { return CODE_SIZE * 0.6; }

  estimate(it) {
    switch (it.type) {
      case "line": case "pair": return LH;
      case "gap": return GAP_H;
      case "above": return 36;
      case "note": case "load": return 72;
      case "thread": return it.thread.resolved && !this.openThreads.has(it.thread.id) ? 46 : 64 + 80 * it.thread.comments.length;
      case "draft": return 110;
      case "composer": return 200;
      default: return LH;
    }
  }

  layout() {
    const o = new Array(this.items.length + 1);
    o[0] = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      o[i + 1] = o[i] + (this.heights[it.key] && !it.row ? this.heights[it.key] : this.estimate(it));
    }
    this.offsets = o;
    this.clampScroll();
  }

  total() { return this.offsets[this.offsets.length - 1] ?? 0; }
  clampScroll() {
    this.scrollY = clamp(this.scrollY, 0, Math.max(0, this.total() - this.viewH + 40));
    this.scrollX = clamp(this.scrollX, 0, this.maxScrollX());
  }
  maxScrollX() {
    const code = this.split ? (this.viewW - 12) / 2 - this.gutterW - 16 : this.viewW - 12 - 2 * this.gutterW - 16;
    return Math.max(0, (this.maxCols ?? 0) * this.charW() + 40 - code);
  }

  itemAt(y) {
    const o = this.offsets;
    let lo = 0, hi = this.items.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (o[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  ensureVisible(i, margin = 3 * LH) {
    if (i < 0 || i >= this.items.length) return;
    const top = this.offsets[i], bottom = this.offsets[i + 1];
    if (top < this.scrollY + margin) this.scrollY = top - margin;
    else if (bottom > this.scrollY + this.viewH - margin) this.scrollY = bottom - this.viewH + margin;
    this.clampScroll();
  }

  // ---- selection and the cursor -------------------------------------------------------

  isLine(it) { return it && (it.type === "line" || it.type === "pair"); }
  sideOf(it, side) {
    const r = it.row;
    if (it.type === "line") return r;
    return side === "LEFT" ? r.left : r.right;
  }
  commentable(it, side) {
    if (!this.isLine(it)) return false;
    const l = this.sideOf(it, side);
    if (!l) return false;
    return this.review.kind === "local" || l.hunk >= 0;
  }
  hunkOf(it) { return it.type === "line" ? it.row.hunk : (it.row.left ?? it.row.right).hunk; }

  // The selection as a GitHub anchor: start and end lines, and what they say now.
  anchor({ any = false } = {}) {
    let lo, hi, side = this.side;
    if (this.sel) { lo = Math.min(this.sel.a, this.sel.b); hi = Math.max(this.sel.a, this.sel.b); side = this.sel.side; }
    else if (this.cursor >= 0) lo = hi = this.cursor;
    else return null;
    const lines = [];
    for (let i = lo; i <= hi; i++) {
      const it = this.items[i];
      if (!this.isLine(it)) continue;
      const l = this.sideOf(it, side);
      if (!l) continue;
      if (!any && !this.commentable(it, side)) return { error: "Only lines in the diff can be commented on, not expanded context." };
      const s = it.type === "line" ? (l.kind === "-" ? "LEFT" : "RIGHT") : side;
      lines.push({ side: s, line: s === "LEFT" ? l.old : l.new, raw: l.raw, kind: l.kind });
    }
    if (!lines.length) return null;
    const first = lines[0], last = lines[lines.length - 1];
    return {
      path: this.path, side: last.side, line: last.line,
      startSide: lines.length > 1 ? first.side : null, startLine: lines.length > 1 ? first.line : null,
      snippet: lines.map(({ side, line, raw }) => ({ side, line, raw })),
      suggest: last.side === "RIGHT" ? lines.filter((l) => l.side === "RIGHT").map((l) => l.raw) : null,
    };
  }

  inSel(i, side) {
    const s = this.sel;
    if (s) return i >= Math.min(s.a, s.b) && i <= Math.max(s.a, s.b) && (!this.split || side === s.side);
    return false;
  }

  lineAt(i, side = this.side) {
    const it = this.items[i];
    if (!this.isLine(it)) return null;
    return it.type === "line" ? it.row : side === "LEFT" ? it.row.left : it.row.right;
  }

  // The cursor's column, kept inside its line (and on screen).
  fitCol() {
    const len = this.lineAt(this.cursor)?.text?.length ?? 0;
    this.col = clamp(this.wantCol, 0, Math.max(0, len - 1));
    this.showCol();
  }

  showCol() {
    const w = this.charW(), x = this.col * w, margin = 4 * w;
    const code = this.split ? (this.viewW - 12) / 2 - this.gutterW - 16 : this.viewW - 12 - 2 * this.gutterW - 16;
    if (x < this.scrollX + margin) this.scrollX = Math.max(0, x - margin);
    else if (x + w > this.scrollX + code - margin) this.scrollX = x + w - code + margin;
    this.clampScroll();
  }

  setCol(c, cx, want = c) { this.col = Math.max(0, c); this.wantCol = want; this.showCol(); cx.notify(); }

  // h / l: a character; in split view, past the edge goes to the other side.
  stepCol(delta, cx) {
    const len = this.lineAt(this.cursor)?.text?.length ?? 0;
    const c = this.col + delta;
    if (c >= 0 && c < len) return this.setCol(c, cx);
    if (!this.split || this.visual) return;
    const other = delta < 0 ? "LEFT" : "RIGHT";
    if (this.side === other || !this.lineAt(this.cursor, other)) return;
    this.side = other; this.sel = null;
    const olen = this.lineAt(this.cursor)?.text?.length ?? 0;
    this.setCol(delta < 0 ? Math.max(0, olen - 1) : 0, cx);
  }

  firstNonBlank() { const tx = this.lineAt(this.cursor)?.text ?? ""; const m = /\S/.exec(tx); return m ? m.index : 0; }

  // w / b / e, crossing lines like Vim.
  word(kind, cx) {
    const cls = (ch) => (/\s/.test(ch) ? 0 : /\w/.test(ch) ? 1 : 2);
    let text = this.lineAt(this.cursor)?.text ?? "", c = this.col;
    const nextLine = (d) => {
      const before = this.cursor;
      this.moveCursor(d, cx, this.visual);
      if (this.cursor === before) return false;
      text = this.lineAt(this.cursor)?.text ?? "";
      return true;
    };
    if (kind === "w") {
      if (c < text.length) { const k = cls(text[c]); if (k) while (c < text.length && cls(text[c]) === k) c++; }
      while (c < text.length && cls(text[c]) === 0) c++;
      if (c >= text.length) { if (!nextLine(1)) return; c = 0; while (c < text.length && cls(text[c]) === 0) c++; }
      return this.setCol(Math.min(c, Math.max(0, text.length - 1)), cx);
    }
    if (kind === "e") {
      for (let tries = 0; tries < 50; tries++) {
        c++;
        while (c < text.length && cls(text[c]) === 0) c++;
        if (c < text.length) break;
        if (!nextLine(1)) return;
        c = -1;
      }
      const k = cls(text[c]);
      while (c + 1 < text.length && cls(text[c + 1]) === k) c++;
      return this.setCol(c, cx);
    }
    for (let tries = 0; tries < 50; tries++) {
      c--;
      while (c >= 0 && cls(text[c]) === 0) c--;
      if (c >= 0) break;
      if (!nextLine(-1)) return;
      c = text.length;
    }
    const k = cls(text[c]);
    while (c > 0 && cls(text[c - 1]) === k) c--;
    this.setCol(c, cx);
  }

  toggleVisual(cx) {
    this.visual = !this.visual;
    if (this.visual && this.cursor >= 0) this.sel = { a: this.cursor, b: this.cursor, side: this.side };
    else if (!this.visual) this.sel = null;
    cx.notify();
  }

  moveCursor(delta, cx, extend = false) {
    let i = this.cursor;
    for (let n = 0; n < this.items.length; n++) {
      i += delta;
      if (i < 0 || i >= this.items.length) return;
      const it = this.items[i];
      if (!this.isLine(it)) continue;
      if (this.split && !this.sideOf(it, this.side) && !extend) { /* empty half: still a stop */ }
      if (extend) {
        const base = this.sel ?? { a: this.cursor, b: this.cursor, side: this.side };
        const anchorIt = this.items[base.a];
        if (this.review.kind === "pr" && this.hunkOf(it) !== this.hunkOf(anchorIt)) return;
        if (this.split && !this.sideOf(it, base.side)) continue;
        this.sel = { ...base, b: i };
      } else this.sel = null;
      this.cursor = i;
      this.ensureVisible(i);
      this.fitCol();
      cx.notify();
      return;
    }
  }

  stepChange(delta, cx) {
    const changed = (it) => this.isLine(it) && (it.type === "line" ? it.row.kind !== " " : it.row.left?.kind === "-" || it.row.right?.kind === "+");
    let i = this.cursor;
    // Skip the rest of the change block we're in, then find the next one's first line.
    while (i >= 0 && i < this.items.length && changed(this.items[i])) i += delta;
    while (i >= 0 && i < this.items.length && !changed(this.items[i])) i += delta;
    if (i < 0 || i >= this.items.length) return delta > 0 ? this.stepFile(1, cx) : null;
    if (delta < 0) while (i > 0 && changed(this.items[i - 1])) i--;
    this.cursor = i; this.sel = null;
    this.ensureVisible(i, this.viewH / 3);
    cx.notify();
  }

  gutterDown(i, side, e, cx) {
    this.h.focus();
    this.visual = false;
    const it = this.items[i];
    if (!this.isLine(it)) return;
    const s = this.split ? side : "RIGHT";
    if (e.modifiers?.shift && (this.sel || this.cursor >= 0)) {
      const base = this.sel ?? { a: this.cursor, b: this.cursor, side: s };
      if (this.review.kind !== "pr" || this.hunkOf(this.items[base.a]) === this.hunkOf(it)) this.sel = { ...base, b: i };
      this.cursor = i;
      this.drag = null;
      this.openComposer(cx);
      return;
    }
    this.side = s;
    this.cursor = i;
    this.sel = { a: i, b: i, side: s };
    this.drag = { kind: "sel" };
    cx.notify();
  }

  viewportMove(e, cx) {
    if (this.drag?.kind !== "sel") return;
    const y = e.local_position.y;
    if (y < LH) this.scrollY -= LH; else if (y > this.viewH - LH) this.scrollY += LH;
    this.clampScroll();
    const i = this.itemAt(y + this.scrollY);
    const it = this.items[i];
    if (!this.isLine(it) || i === this.sel.b) return;
    if (this.review.kind === "pr" && this.hunkOf(it) !== this.hunkOf(this.items[this.sel.a])) return;
    if (this.split && !this.sideOf(it, this.sel.side)) return;
    this.sel = { ...this.sel, b: i };
    this.cursor = i;
    this.drag.moved = true;
    cx.notify();
  }

  endDrag(cx) {
    const d = this.drag;
    this.drag = null;
    if (d?.kind === "sel") this.openComposer(cx);
    else if (d) cx.notify();
  }

  // ---- comments -----------------------------------------------------------------------

  newTextarea(value, placeholder, onSave, onShiftSave) {
    const st = TextareaState.new({ placeholder, value, rows: 4 });
    st.set_auto_grow(4, 18);
    this.track(st, "text");
    st.on("submit", (e, cx) => { if (e.secondary) (e.shift && onShiftSave ? onShiftSave : onSave)(cx); });
    return st;
  }

  focusLater(cx, state) {
    cx.spawn(async (cx) => { await cx.sleep(40); try { state.focus(); } catch {} });
  }

  openComposer(cx, { suggest = false, ask = false } = {}) {
    if (ask && !this.agentInfo()) return this.openAsk(cx);
    const an = this.anchor({ any: ask });
    this.visual = false;
    if (!an) return;
    if (an.error) { notify({ title: an.error, level: "warning", timeout: 3000 }); this.sel = null; cx.notify(); return; }
    if (this.composer && this.composer.state.value().trim()) {
      const same = this.composer.path === an.path && this.composer.line === an.line && this.composer.side === an.side;
      if (!same) {
        notify({ title: `Finish or cancel the ${this.composer.ask ? "question" : "comment"} you're writing first`, level: "warning", timeout: 3000 });
        if (this.composer.path !== this.path) this.selectFile(this.composer.path, cx);
        const i = this.items.findIndex((x) => x.type === "composer");
        if (i >= 0) this.ensureVisible(i, 40);
        this.focusLater(cx, this.composer.state);
        cx.notify();
        return;
      }
    }
    if (this.composer) try { this.composer.state.release(); } catch {}
    const value = suggest && an.suggest ? this.suggestion(an.suggest) : "";
    this.composer = { ...an, ask, editing: null, preview: false,
      state: this.newTextarea(value, ask ? `Ask ${this.ws?.agent?.name ?? "the agent"} about these lines…` : "Leave a comment", (cx) => (ask ? this.askFromComposer(cx) : this.saveComposer(cx))) };
    this.rebuild();
    const i = this.items.findIndex((x) => x.type === "composer");
    if (i >= 0) this.ensureVisible(i, 40);
    this.focusLater(cx, this.composer.state);
    cx.notify();
  }

  suggestion(lines) { return "```suggestion\n" + lines.join("\n") + "\n```"; }

  insertSuggestion(cx) {
    const c = this.composer;
    if (!c?.suggest) return;
    const v = c.state.value();
    c.state.set_value((v.trim() ? v.replace(/\s*$/, "\n\n") : "") + this.suggestion(c.suggest));
    this.focusLater(cx, c.state);
    cx.notify();
  }

  editDraft(d, cx) {
    if (this.composer?.state.value().trim()) { notify({ title: "Finish or cancel the comment you're writing first", level: "warning", timeout: 3000 }); return; }
    if (this.composer) try { this.composer.state.release(); } catch {}
    const suggest = d.side === "RIGHT" ? (d.snippet ?? []).filter((s) => s.side === "RIGHT").map((s) => s.raw) : null;
    this.composer = { path: d.path, side: d.side, line: d.line, startSide: d.startSide, startLine: d.startLine, snippet: d.snippet, suggest, editing: d.id, preview: false,
      state: this.newTextarea(d.body, "Leave a comment", (cx) => this.saveComposer(cx)) };
    this.rebuild();
    this.focusLater(cx, this.composer.state);
    cx.notify();
  }

  cancelComposer(cx) {
    if (!this.composer) return;
    try { this.composer.state.release(); } catch {}
    this.composer = null; this.sel = null; this.typing = null;
    this.rebuild(); this.h.focus(); cx.notify();
  }

  saveComposer(cx) {
    const c = this.composer;
    if (c?.ask) return this.askFromComposer(cx);
    const body = c?.state.value().trim();
    if (!body) return;
    if (c.editing) {
      const d = this.state.drafts.find((x) => x.id === c.editing);
      if (d) { d.body = body; d.updatedAt = new Date().toISOString(); delete d.proposed; }
    } else {
      this.state.drafts.push({ id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, path: c.path, side: c.side, line: c.line, startSide: c.startSide, startLine: c.startLine, snippet: c.snippet, body, createdAt: new Date().toISOString() });
    }
    this.saveState(cx);
    this.cancelComposer(cx);
  }

  postNow(cx) {
    const c = this.composer, body = c?.state.value().trim();
    if (!body || this.busy) return;
    this.busy = "Posting comment…";
    cx.spawn(async (cx) => {
      try {
        await src.postSingle(this.repo, this.review, { ...c, body });
        if (c.editing) { this.state.drafts = this.state.drafts.filter((x) => x.id !== c.editing); this.saveState(cx); }
        this.cancelComposer(cx);
        this.threads = await src.loadThreads(this.repo, this.review.slug, this.review.pr.number);
        this.rebuild();
      } catch (e) { notify({ title: "Couldn't post the comment", body: String(e.message ?? e), level: "error" }); }
      finally { this.busy = false; cx.notify(); }
    });
    cx.notify();
  }

  deleteDraft(d, cx) {
    this.state.drafts = this.state.drafts.filter((x) => x.id !== d.id);
    this.saveState(cx); this.rebuild(); cx.notify();
  }

  startReply(t, cx) {
    if (this.replying?.thread === t.id) return this.focusLater(cx, this.replying.state);
    if (this.replying) try { this.replying.state.release(); } catch {}
    this.replying = { thread: t.id, state: this.newTextarea("", "Reply…", (cx) => this.sendReply(cx)) };
    this.focusLater(cx, this.replying.state);
    cx.notify();
  }

  endReply(cx) {
    if (this.replying) try { this.replying.state.release(); } catch {}
    this.replying = null; this.typing = null; this.h.focus(); cx.notify();
  }

  sendReply(cx) {
    const r = this.replying, body = r?.state.value().trim();
    const t = this.threads.find((x) => x.id === r?.thread);
    if (!body || !t || this.busy) return;
    this.busy = "Replying…";
    cx.spawn(async (cx) => {
      try {
        await src.reply(this.repo, this.review, t, body);
        this.endReply(cx);
        this.threads = await src.loadThreads(this.repo, this.review.slug, this.review.pr.number);
        this.rebuild();
      } catch (e) { notify({ title: "Couldn't reply", body: String(e.message ?? e), level: "error" }); }
      finally { this.busy = false; cx.notify(); }
    });
    cx.notify();
  }

  toggleResolved(t, cx) {
    if (this.busy) return;
    const want = !t.resolved;
    t.resolved = want;
    if (want) this.openThreads.delete(t.id);
    this.rebuild();
    cx.spawn(async (cx) => {
      try { await src.setResolved(this.repo, t, want); }
      catch (e) { t.resolved = !want; notify({ title: "Couldn't change the conversation", body: String(e.message ?? e), level: "error" }); }
      this.rebuild(); cx.notify();
    });
    cx.notify();
  }

  toggleViewed(path, cx, advance = false) {
    const f = this.fileMap.get(path);
    if (!f) return;
    const want = !this.isViewed(f);
    if (this.review.kind === "pr") {
      this.review.viewed[path] = want;
      const review = this.review;
      cx.spawn(async (cx) => {
        try { await src.setViewed(this.repo, review, path, want); }
        catch (e) { review.viewed[path] = !want; notify({ title: "Couldn't mark the file", body: String(e.message ?? e), level: "error" }); cx.notify(); }
      });
    } else {
      if (want) this.state.viewed[path] = diffHash(f); else delete this.state.viewed[path];
      this.saveState(cx);
    }
    if (want && advance) this.stepFile(1, cx, true);
    cx.notify();
  }

  expandGap(gap, how, cx) {
    const ex = (this.expanded[this.path] ??= {});
    const e = (ex[gap.id] ??= { top: 0, bottom: 0 });
    if (how === "all") e.top += gap.size;
    else if (how === "down") e.top += EXPAND_STEP;
    else e.bottom += EXPAND_STEP;
    this.rebuild(); cx.notify();
  }

  expandAll(cx) {
    const ex = (this.expanded[this.path] ??= {});
    for (const it of this.items) if (it.type === "gap" && it.row.canExpand) (ex[it.row.id] ??= { top: 0, bottom: 0 }).top += it.row.size;
    this.rebuild(); cx.notify();
  }

  copyLines(cx) {
    const an = this.anchor();
    if (!an?.snippet) return;
    cx.write_to_clipboard(an.snippet.map((s) => s.raw).join("\n"));
    notify({ title: `Copied ${plural(an.snippet.length, "line")}`, level: "info", timeout: 1500 });
  }

  // ---- finishing the review -----------------------------------------------------------

  openSubmit(cx) {
    if (this.submit) { this.closeSubmit(cx); return; }
    const st = this.newTextarea(this.state.body ?? "", this.review.kind === "pr" ? "Leave a comment (optional)" : "Summary (optional)", (cx) => this.doSubmit(cx));
    st.on("change", () => { this.state.body = st.value(); });
    this.submit = { state: st, event: "COMMENT", error: null };
    this.focusLater(cx, st);
    cx.notify();
  }

  closeSubmit(cx) {
    if (!this.submit) return;
    this.state.body = this.submit.state.value();
    this.saveState(cx);
    try { this.submit.state.release(); } catch {}
    this.submit = null; this.typing = null; this.h.focus(); cx.notify();
  }

  doSubmit(cx) {
    const s = this.submit;
    if (!s || this.busy) return;
    if (this.review.kind !== "pr") return this.copyReview(cx);
    const body = s.state.value().trim();
    for (const d of this.state.drafts) d.outdated = !this.verify(d);
    const drafts = this.state.drafts.filter((d) => !d.outdated && !d.proposed);
    const pendingN = this.review.pr.pending?.comments?.totalCount ?? 0;
    if (!drafts.length && !body && !pendingN && s.event !== "APPROVE") { s.error = "Add a comment, or leave a summary."; cx.notify(); return; }
    s.error = null;
    let done = 0;
    this.busy = drafts.length ? `Posting ${drafts.length} comments…` : "Submitting…";
    cx.spawn(async (cx) => {
      try {
        await src.submitReview(this.repo, this.review, drafts, s.event, body, async (d) => {
          done++;
          this.busy = `Posted ${done} of ${drafts.length}…`;
          this.state.drafts = this.state.drafts.filter((x) => x.id !== d.id);
          await this.repo.writeFile(this.statePath(this.review.key), JSON.stringify(this.state, null, 1)).catch(() => {});
          cx.notify();
        });
        this.state.body = "";
        s.state.set_value("");
        this.closeSubmit(cx);
        notify({ title: { APPROVE: "Approved", REQUEST_CHANGES: "Changes requested", COMMENT: "Review submitted" }[s.event], body: `#${this.review.pr.number} ${this.review.pr.title}`, level: "success" });
        this.threads = await src.loadThreads(this.repo, this.review.slug, this.review.pr.number);
        this.rebuild();
      } catch (e) {
        s.error = String(e.message ?? e);
        this.rebuild();
      } finally { this.busy = false; cx.notify(); }
    });
    cx.notify();
  }

  copyReview(cx) {
    const r = this.review, body = this.submit?.state.value().trim() ?? this.state.body;
    const out = [`# Review: ${r.title}`, ""];
    if (body) out.push(body, "");
    const byFile = new Map();
    for (const d of this.state.drafts) { if (!byFile.has(d.path)) byFile.set(d.path, []); byFile.get(d.path).push(d); }
    for (const [path, ds] of byFile) {
      for (const d of ds.sort((x, y) => (x.startLine ?? x.line) - (y.startLine ?? y.line))) {
        const range = d.startLine != null ? `${d.startLine}-${d.line}` : `${d.line}`;
        out.push(`## ${path}:${range}${d.side === "LEFT" ? " (old)" : ""}`, "");
        if (d.snippet?.length) out.push("```" + (path.split(".").pop() ?? ""), ...d.snippet.map((s) => s.raw), "```", "");
        out.push(d.body, "");
      }
    }
    cx.write_to_clipboard(out.join("\n"));
    notify({ title: `Copied the review (${plural(this.state.drafts.length, "comment")})`, body: "Paste it to an agent or into a doc.", level: "success", timeout: 3000 });
  }

  clearDrafts(cx) {
    this.state.drafts = []; this.state.body = "";
    this.submit?.state.set_value("");
    this.saveState(cx); this.rebuild(); cx.notify();
  }

  // ---- the workspace: agent and Neovim beside the review --------------------------------

  saveWs() { this.saveOwn("ws", this.ws); if (this.ws) { this.wsDone = true; this.saveOwn("wsDone", true); } }

  alive(term) {
    const mine = this.myPane();
    return Boolean(term && mine && panes().some((p) => p.terminal === term && p.tab === mine.tab));
  }

  agentInfo() {
    const term = this.ws?.agentTerm;
    if (!this.alive(term)) return null;
    return agents().find((x) => x.address === term) ?? { address: term, status: null };
  }

  // Opens the code, Neovim and the agent for this review (reusing what's already in the tab).
  setupWorkspace(cx) {
    if (this.settingUp) return;
    const review = this.review;
    const fresh = this.wantWorkspace;
    this.wantWorkspace = false;
    // Reopened without the picker (a restart): only rebuild what this tab had.
    if (!fresh && !this.ws) return;
    if (this.repo.on) { if (fresh) notify({ title: "The agent and Neovim work on spaces on this computer for now", level: "warning" }); return; }
    this.settingUp = true;
    cx.spawn(async (cx) => {
      try {
        const ws = this.ws ?? {};
        if (fresh) ws.agent = this.wantAgent ?? null;
        let dir = this.repo.root;
        if (review.kind === "pr") {
          this.busy = "Checking out the PR…"; cx.notify();
          const wt = await ag.ensureWorktree(this.repo, review);
          dir = wt.dir;
          if (wt.dirty) notify({ title: "The PR's worktree has local changes", body: `${dir} was left as it is, so it may not match the PR's head.`, level: "warning" });
        }
        const moved = ws.dir && ws.dir !== dir;
        ws.dir = dir;
        ws.gitDir = await ag.gitDirOf(dir);
        this.ws = ws;
        const mine = this.myPane();
        if (!mine) throw new Error("couldn't find the review's pane");
        const f = this.fileMap.get(this.path);
        const file = f ? `${dir}/${f.path}` : null;
        // Agent on the right, Neovim under it.
        let created = false;
        if (ws.agent && !this.alive(ws.agentTerm)) {
          created = true;
          ws.agentTerm = await this.openBeside(cx, mine.pane, ws.agent.run, dir, "right", `${ws.agent.name} · review`);
          ws.briefedFor = null;
        }
        if (!this.alive(ws.nvimTerm)) {
          created = true;
          ws.sock = ag.nvimSocket();
          const from = this.alive(ws.agentTerm) ? panes().find((p) => p.terminal === ws.agentTerm)?.pane : mine.pane;
          ws.nvimTerm = await this.openBeside(cx, from, ["nvim", "--listen", ws.sock, ...(file ? [file] : [])], dir, from === mine.pane ? "right" : "down", "Neovim · review");
        } else if (moved && ws.sock) {
          await ag.nvimOpen(ws.sock, file ?? dir, 1).catch(() => {});
        }
        if (created) run("pane.focus", { pane: mine.pane });
        this.saveWs();
        this.synced = null;
        if (ws.agentTerm && ws.briefedFor !== review.key) this.brief(cx);
      } catch (e) {
        notify({ title: "Couldn't set up the agent and Neovim", body: String(e.message ?? e), level: "error" });
      } finally { this.settingUp = false; this.busy = false; cx.notify(); }
    });
  }

  // A bare Review pane hands over to one with its own props, so the tab keeps its review.
  respawn(target, cx) {
    const mine = this.myPane();
    if (!mine) { notify({ title: "Couldn't find the Review pane", level: "error" }); return; }
    const agent = this.agentChoice === "none" ? null : this.agentChoice;
    const id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const p = { id, folder: this.repo.root, agent, ...(target.kind === "pr" ? { pr: target.number } : { mode: target.mode, ...(target.base ? { base: target.base } : {}) }) };
    run("pane.split", { pane: mine.pane, direction: "right", mod: MOD, props: p });
    run("pane.close", { pane: mine.pane });
    cx.notify();
  }

  // Starts a terminal beside `pane` and returns its address once its pane shows.
  async openBeside(cx, pane, argv, folder, place, name) {
    const tab = this.myPane()?.tab;
    const before = new Set(panes().filter((p) => p.tab === tab).map((p) => p.pane));
    run("pane.focus", { pane });
    run("terminal.open", { argv, folder, place, name });
    for (let i = 0; i < 80; i++) {
      const p = panes().find((x) => x.tab === tab && x.terminal && !before.has(x.pane));
      if (p) return p.terminal;
      await cx.sleep(100);
    }
    throw new Error(`${name} didn't start`);
  }

  // Tells the agent what it's helping with, once it's ready for input.
  brief(cx) {
    const ws = this.ws, review = this.review;
    cx.spawn(async (cx) => {
      for (let i = 0; i < 120; i++) {
        const a = this.agentInfo();
        if (!a) return;
        if (a.status === "idle" || a.status === "done") break;
        await cx.sleep(500);
      }
      try {
        await this.send(ag.briefing(review, ws.dir));
        ws.briefedFor = review.key; this.saveWs();
      } catch (e) { notify({ title: "Couldn't brief the agent", body: String(e.message ?? e), level: "error" }); }
    });
  }

  async send(text) {
    const term = this.ws?.agentTerm;
    if (!this.alive(term)) throw new Error("No agent in this tab. Start one from the agent button.");
    const r = await hc(["send", term, text]);
    if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim() || "hc send failed");
  }

  startAgent(agent, cx) {
    this.wantAgent = agent; this.wantWorkspace = true;
    this.asking = this.asking ? this.asking : null;
    this.setupWorkspace(cx);
  }

  openAsk(cx, { file = false } = {}) {
    if (this.asking) { this.focusLater(cx, this.asking.state); return; }
    const an = file ? (this.path ? { path: this.path, file: true } : null) : this.anchor({ any: true });
    const st = this.newTextarea("", file ? "Ask about this file…" : "Ask about the review…", (cx) => this.sendAsk(cx));
    this.asking = { state: st, an: an && !an.error ? an : null };
    if (!this.known) cx.spawn(async (cx) => { try { this.known = (await knownAgents({ on: this.repo.on })).filter((x) => x.installed); } catch { this.known = []; } cx.notify(); });
    this.focusLater(cx, st);
    cx.notify();
  }

  closeAsk(cx) {
    if (!this.asking) return;
    try { this.asking.state.release(); } catch {}
    this.asking = null; this.typing = null; this.h.focus(); cx.notify();
  }

  sendAsk(cx) {
    const k = this.asking, text = k?.state.value().trim();
    if (!text) return;
    const prompt = ag.askPrompt(this.review, k.an, text);
    cx.spawn(async (cx) => {
      try { await this.send(prompt); this.closeAsk(cx); }
      catch (e) { notify({ title: "Couldn't ask the agent", body: String(e.message ?? e), level: "error" }); }
      cx.notify();
    });
  }

  // The comment box's text, as a question about its lines.
  askFromComposer(cx) {
    const c = this.composer, text = c?.state.value().trim();
    if (!c || !text) return;
    if (!this.agentInfo()) { notify({ title: "No agent in this tab", body: "Start one from the agent button.", level: "warning" }); return; }
    const prompt = ag.askPrompt(this.review, c, text);
    cx.spawn(async (cx) => {
      try { await this.send(prompt); this.cancelComposer(cx); }
      catch (e) { notify({ title: "Couldn't ask the agent", body: String(e.message ?? e), level: "error" }); }
      cx.notify();
    });
  }

  agentReview(path, focus, cx) {
    if (!this.agentInfo()) { this.openAsk(cx); return; }
    cx.spawn(async (cx) => {
      try {
        await this.send(ag.reviewPrompt(this.review, path, focus));
        notify({ title: `${this.ws.agent?.name ?? "The agent"} is reviewing ${path ? path.split("/").pop() : "the changes"}`, body: "Its comments show up here as suggestions to keep or discard.", timeout: 4000 });
        this.closeAsk(cx);
      } catch (e) { notify({ title: "Couldn't start the review round", body: String(e.message ?? e), level: "error" }); }
    });
  }

  // The agent's comments, as drafts waiting for the reviewer to keep them.
  pollInbox(cx) {
    const ws = this.ws;
    if (!ws?.gitDir || this.stage !== "review" || this.polling) return;
    this.polling = true;
    cx.spawn(async (cx) => {
      try {
        const recs = await ag.takeInbox(ws.gitDir);
        if (!recs.length) return;
        for (const r of recs) {
          const f = this.fileMap.get(r.path);
          const from = r.startLine ?? r.line, side = r.side === "LEFT" ? "LEFT" : "RIGHT";
          const snippet = [];
          if (f) for (let n = from; n <= r.line; n++) { const raw = this.lineText(f, side, n); if (raw != null) snippet.push({ side, line: n, raw }); }
          this.state.drafts.push({ id: r.id, path: r.path, side, line: r.line, startSide: r.startLine != null ? side : null, startLine: r.startLine ?? null,
            snippet: snippet.length === r.line - from + 1 ? snippet : [], body: r.body, createdAt: r.at, by: ws.agent?.name ?? "Agent", proposed: true });
        }
        this.saveState(cx); this.rebuild();
        const files = [...new Set(recs.map((r) => r.path.split("/").pop()))];
        notify({ title: `${ws.agent?.name ?? "The agent"} suggested ${plural(recs.length, "comment")}`, body: files.slice(0, 3).join(", ") + (files.length > 3 ? "…" : ""), timeout: 4000 });
      } catch {} finally { this.polling = false; cx.notify(); }
    });
  }

  keepDraft(d, cx) { delete d.proposed; this.saveState(cx); this.rebuild(); cx.notify(); }

  // The new-version line at the cursor (deleted lines map to the next line that exists).
  // The cursor's column as Neovim counts it (a byte offset in the raw line), on the new side.
  cursorByte() {
    const l = this.lineAt(this.cursor);
    if (!l || l.kind === "-" || (this.split && this.side === "LEFT" && l.kind !== " ")) return 0;
    return byteOffset(l.raw ?? "", this.col);
  }

  cursorLine() {
    for (let i = this.cursor; i >= 0 && i < this.items.length; i++) {
      const it = this.items[i];
      if (!this.isLine(it)) continue;
      const n = it.type === "line" ? it.row.new : it.row.right?.new;
      if (n != null) return n;
    }
    return 1;
  }

  // Review → Neovim when the cursor moves; Neovim → Review while you move around in it.
  syncNvim(cx) {
    const ws = this.ws;
    if (!ws?.sock || !ws.dir || this.stage !== "review" || this.nvimBusy || !this.alive(ws.nvimTerm)) return;
    const inNvim = focused()?.terminal === ws.nvimTerm;
    if (inNvim) {
      if ((this.nvimTick = (this.nvimTick ?? 0) + 1) % 3) return;
      this.nvimBusy = true;
      cx.spawn(async (cx) => {
        try {
          const w = await ag.nvimWhere(ws.sock);
          if (!w) return;
          const strip = (p) => p.replace(/^\/private(?=\/)/, "");
          const rel = strip(w.file).startsWith(strip(ws.dir) + "/") ? strip(w.file).slice(strip(ws.dir).length + 1) : null;
          const key = `${rel}:${w.line}:${w.col}`;
          if (!rel || key === this.fromNvim || !this.fileMap.has(rel)) return;
          this.fromNvim = key;
          if (rel !== this.path) this.selectFile(rel, cx);
          const i = this.items.findIndex((it) => this.isLine(it) && (it.type === "line" ? it.row.new === w.line : it.row.right?.new === w.line));
          if (i >= 0) {
            this.cursor = i; this.sel = null; this.side = "RIGHT"; this.ensureVisible(i, this.viewH / 3);
            this.wantCol = displayCol(this.lineAt(i, "RIGHT")?.raw ?? "", w.col); this.fitCol();
          }
          this.synced = `${rel}:${w.line}:${this.cursorByte()}`;
          cx.notify();
        } finally { this.nvimBusy = false; }
      });
      return;
    }
    if (!this.follow || !this.path) return;
    const line = this.cursorLine(), byte = this.cursorByte(), key = `${this.path}:${line}:${byte}`;
    if (key === this.synced) return;
    this.synced = key;
    this.nvimBusy = true;
    const file = `${ws.dir}/${this.path}`;
    cx.spawn(async () => { try { await ag.nvimOpen(ws.sock, file, line, byte); } catch {} finally { this.nvimBusy = false; } });
  }

  openInNvim(cx) {
    const ws = this.ws;
    if (!this.alive(ws?.nvimTerm)) { this.wantWorkspace = true; this.wantAgent = this.ws?.agent ?? null; this.setupWorkspace(cx); return; }
    const file = `${ws.dir}/${this.path}`, line = this.cursorLine(), byte = this.cursorByte();
    this.synced = `${this.path}:${line}:${byte}`;
    cx.spawn(async () => {
      try { await ag.nvimOpen(ws.sock, file, line, byte); } catch {}
      run("pane.focus", { terminal: ws.nvimTerm });
    });
  }

  dropWorktree(cx) {
    const dir = this.ws?.dir;
    if (!dir) return;
    cx.spawn(async (cx) => {
      try {
        for (const term of [this.ws.nvimTerm, this.ws.agentTerm]) if (this.alive(term)) run("terminal.kill", { terminal: term });
        await cx.sleep(300);
        await ag.removeWorktree(this.repo, dir);
        this.ws = null; this.saveWs();
        notify({ title: "Worktree removed", body: dir, level: "success" });
      } catch (e) { notify({ title: "Couldn't remove the worktree", body: String(e.message ?? e), level: "error" }); }
      cx.notify();
    });
  }

  agentChips(t) {
    const list = this.known;
    const chip = (key, label) => div().id(`ac-${key}`).h(26).px(10).flex().items_center().rounded(13).text_size(12).cursor_pointer().border_1()
      .border_color(this.agentChoice === key ? t.accent : t.border).when(this.agentChoice === key, (e) => e.bg(a(t.accent, "22")))
      .hover((s) => s.bg(t.hover)).on_click((_e, cx) => { this.agentChoice = key; cx.notify(); }).child(label);
    return h_flex().gap(8).items_center().flex_wrap()
      .child(div().text_size(12).text_color(t.dim).child("Agent beside the review (tab):"))
      .when(list == null, (e) => e.child(div().text_size(12).text_color(t.dim).child("looking…")))
      .when(Boolean(list), (e) => e.children(list.map((x) => chip(x.key, x.name))).child(chip("none", "None (Neovim only)")));
  }

  agentButton(t) {
    const info = this.agentInfo(), name = this.ws?.agent?.name;
    const proposed = this.state.drafts.filter((d) => d.proposed).length;
    const color = info?.status === "working" ? t.working : info?.status === "blocked" ? t.blocked : info ? t.idle : t.dim;
    return h_flex().id("agent-btn").h(28).px(10).gap(6).items_center().flex_none().rounded(6).text_size(12).cursor_pointer()
      .border_1().border_color(this.asking ? t.accent : t.border).bg(t.raised).hover((s) => s.bg(t.hover))
      .tooltip("Ask the agent (a: lines, shift-a: this file), or have it review")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => (this.asking ? this.closeAsk(cx) : this.openAsk(cx)))
      .child(info?.status === "working"
        ? div().text_color(color).frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90)
        : div().size(8).rounded(4).bg(color))
      .child(info ? (name ?? "Agent") : "Agent")
      .when(proposed > 0, (e) => e.child(div().px(6).h(16).flex().items_center().rounded(8).bg(t.accent).text_color(t.accent_foreground).text_size(10).child(String(proposed))));
  }

  askPanel(t) {
    const k = this.asking, info = this.agentInfo(), name = this.ws?.agent?.name ?? "the agent";
    const an = k.an;
    const body = info
      ? v_flex().w_full().gap(10)
        .child(div().text_size(12).text_color(t.muted).child(an?.file ? `About ${an.path} (the whole file and its changes)` : an ? `About ${an.path.split("/").pop()} ${this.rangeLabel(an)} (the code is included)` : "Ask about anything in the review."))
        .child(this.textareaBox(t, k.state))
        .child(h_flex().gap(8).items_center()
          .child(div().flex_1().text_size(11).text_color(t.dim).child("⌘↵ to send"))
          .child(this.button(t, "ask-send", `Ask ${name}`, (_e, cx) => this.sendAsk(cx), "solid")))
        .child(div().h(1).w_full().bg(t.border))
        .child(div().text_size(12).text_color(t.muted).child(`Or let ${name} leave comments. They arrive as suggestions you keep or discard; the text above becomes its focus.`))
        .child(h_flex().gap(8)
          .child(this.button(t, "rev-file", "Review this file", (_e, cx) => this.agentReview(this.path, k.state.value().trim() || null, cx)))
          .child(this.button(t, "rev-all", "Review all changes", (_e, cx) => this.agentReview(null, k.state.value().trim() || null, cx)))
          .child(div().flex_1())
          .child(this.button(t, "show-agent", "Show", (_e, cx) => { run("pane.focus", { terminal: this.ws.agentTerm }); this.closeAsk(cx); })))
      : v_flex().w_full().gap(10)
        .child(div().text_size(12).text_color(t.muted).child(this.settingUp ? "Starting…" : "No agent in this tab. Start one beside the review:"))
        .child(h_flex().gap(8).flex_wrap().children((this.known ?? []).map((x) => this.button(t, `start-${x.key}`, x.name, (_e, cx) => this.startAgent(x, cx)))))
        .when(this.known && !this.known.length, (e) => e.child(div().text_size(12).text_color(t.dim).child("No agents found (programs.json `run`).")));
    return div().absolute().top(48).right(12).w(460).rounded(10).border_1().border_color(t.border).bg(t.popover ?? t.surface).shadow_lg()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(v_flex().w_full().p(14).gap(10)
        .child(h_flex().items_center().child(div().flex_1().font_semibold().text_size(14).child(info ? `Ask ${name}` : "Agent"))
          .child(this.iconButton(t, "close-ask", "x", (_e, cx) => this.closeAsk(cx), { size: 24 })))
        .child(body));
  }


  // ---- keys ---------------------------------------------------------------------------

  command(c, cx) {
    if (c === "select" && this.stage === "pick") return this.pickEnter(cx);
    if (c === "agent-review") return this.agentReview(this.path, null, cx);
    if (c === "agent-review-all") return this.agentReview(null, null, cx);
    const map = { "next-file": "shift-j", "prev-file": "shift-k", comment: "c", suggest: "s", viewed: "x", visual: "v", submit: "shift-r", refresh: "r", tree: "t", split: "u",
      ask: "a", "ask-file": "shift-a", nvim: "o", follow: "f", down: "j", up: "k" };
    if (map[c]) this.key({ keystroke: map[c], key: map[c], modifiers: {} }, cx);
  }

  key(e, cx) {
    const k = e.keystroke;
    if (this.typing) {
      if (k === "escape") {
        if (this.typing === "text") {
          if (this.composer && !this.composer.state.value().trim()) return this.cancelComposer(cx);
          if (this.replying && !this.replying.state.value().trim()) return this.endReply(cx);
          if (this.submit) return this.closeSubmit(cx);
          if (this.asking) return this.closeAsk(cx);
        }
        if (this.stage === "pick" && this.review) { this.stage = "review"; }
        this.typing = null; this.h.focus(); cx.stop_propagation(); cx.notify();
      } else if (this.stage === "pick" && (k === "tab" || k === "shift-tab")) {
        this.cycleAgent(k === "tab" ? 1 : -1, cx);
      } else if (this.stage === "pick" && (k === "down" || k === "up")) {
        this.pickSel = clamp(this.pickSel + (k === "down" ? 1 : -1), 0, this.pickEntries().length - 1); cx.notify();
      }
      return;
    }
    if (this.stage === "pick") {
      if (k === "down" || k === "j") this.pickSel = clamp(this.pickSel + 1, 0, this.pickEntries().length - 1);
      else if (k === "up" || k === "k") this.pickSel = Math.max(0, this.pickSel - 1);
      else if (k === "enter") this.pickEnter(cx);
      else if (k === "escape" && this.review) this.stage = "review";
      else if (k === "/") this.pickInput.focus();
      else if (k === "tab" || k === "shift-tab") return this.cycleAgent(k === "tab" ? 1 : -1, cx);
      else return;
      cx.stop_propagation(); cx.notify();
      return;
    }
    if (this.stage !== "review") return;
    const page = Math.max(LH, this.viewH - 3 * LH);
    const acts = {
      j: () => this.moveCursor(1, cx, this.visual), down: () => this.moveCursor(1, cx, this.visual),
      k: () => this.moveCursor(-1, cx, this.visual), up: () => this.moveCursor(-1, cx, this.visual),
      v: () => this.toggleVisual(cx), "shift-v": () => this.toggleVisual(cx),
      tab: () => this.stepFile(1, cx), "shift-tab": () => this.stepFile(-1, cx),
      "shift-j": () => this.stepFile(1, cx), "shift-k": () => this.stepFile(-1, cx),
      "shift-down": () => this.moveCursor(1, cx, true), "shift-up": () => this.moveCursor(-1, cx, true),
      h: () => this.stepCol(-1, cx), left: () => this.stepCol(-1, cx), l: () => this.stepCol(1, cx), right: () => this.stepCol(1, cx),
      w: () => this.word("w", cx), b: () => this.word("b", cx), e: () => this.word("e", cx),
      0: () => this.setCol(0, cx), "^": () => this.setCol(this.firstNonBlank(), cx), $: () => this.setCol(Math.max(0, (this.lineAt(this.cursor)?.text?.length ?? 1) - 1), cx, Infinity),
      "]": () => this.stepChange(1, cx), "[": () => this.stepChange(-1, cx),
      n: () => this.stepFile(1, cx), p: () => this.stepFile(-1, cx), "shift-n": () => this.stepFile(1, cx, true),
      c: () => this.openComposer(cx), enter: () => this.openComposer(cx), s: () => this.openComposer(cx, { suggest: true }),
      x: () => this.toggleViewed(this.path, cx, true), "shift-e": () => this.expandAll(cx),
      u: () => this.toggleSplit(cx), t: () => this.toggleTree(cx), "/": () => { if (!this.treeOpen) this.toggleTree(cx); this.treeInput.focus(); },
      y: () => this.copyLines(cx), r: () => this.reload(cx), "shift-r": () => this.openSubmit(cx),
      "shift-o": () => this.review.kind === "pr" && cx.open_url(this.review.pr.url),
      o: () => this.openInNvim(cx), f: () => { this.follow = !this.follow; this.savePref("follow", this.follow); this.synced = null; cx.notify(); },
      a: () => this.openComposer(cx, { ask: true }), "shift-a": () => this.openAsk(cx, { file: true }),
      space: () => this.scrollBy(page, cx), "shift-space": () => this.scrollBy(-page, cx), pagedown: () => this.scrollBy(page, cx), pageup: () => this.scrollBy(-page, cx),
      "ctrl-d": () => this.scrollBy(page / 2, cx), "ctrl-u": () => this.scrollBy(-page / 2, cx),
      // gg: the top (a lone g waits for the second one).
      g: () => {
        if (this.gAt && Date.now() - this.gAt < 800) {
          this.gAt = 0;
          this.scrollY = 0; this.cursor = this.items.findIndex((x) => this.isLine(x));
          this.visual = false; this.sel = null;
          this.fitCol(); cx.notify();
        } else this.gAt = Date.now();
      },
      "shift-g": () => { this.scrollY = this.total(); this.clampScroll(); for (let i = this.items.length - 1; i >= 0; i--) if (this.isLine(this.items[i])) { this.cursor = i; break; } cx.notify(); },
      "shift-/": () => { this.help = !this.help; cx.notify(); }, "?": () => { this.help = !this.help; cx.notify(); },
      escape: () => {
        if (this.help) this.help = false;
        else if (this.asking) return this.closeAsk(cx);
        else if (this.submit) return this.closeSubmit(cx);
        else if (this.visual || this.sel) { this.visual = false; this.sel = null; }
        else if (this.composer && !this.composer.state.value().trim()) return this.cancelComposer(cx);
        cx.notify();
      },
    };
    const f = acts[k] ?? acts[e.key_char];
    if (k !== "g") this.gAt = 0;
    if (!f) return;
    f();
    cx.stop_propagation();
  }

  setSide(side, cx) {
    if (!this.split) return;
    this.side = side; this.sel = null; this.visual = false; cx.notify();
  }

  scrollBy(dy, cx) {
    this.scrollY += dy; this.clampScroll();
    // Keep the cursor on screen.
    const top = this.itemAt(this.scrollY + 2 * LH), bottom = this.itemAt(this.scrollY + this.viewH - 2 * LH);
    if (this.cursor < top || this.cursor > bottom) {
      const from = dy > 0 ? top : bottom;
      for (let i = from; i >= 0 && i < this.items.length; i += dy > 0 ? 1 : -1) if (this.isLine(this.items[i])) { this.cursor = i; break; }
    }
    cx.notify();
  }

  toggleSplit(cx) {
    const keepKey = this.anchorKeyAt(this.cursor);
    this.split = !this.split; this.savePref("split", this.split); this.sel = null;
    const top = this.scrollY;
    this.rebuild();
    if (keepKey) {
      const i = this.items.findIndex((it) => this.isLine(it) && this.keysOf(it).includes(keepKey));
      if (i >= 0) { this.cursor = i; this.ensureVisible(i, this.viewH / 3); }
    } else this.scrollY = top;
    cx.notify();
  }
  keysOf(it) {
    const r = it.row;
    if (it.type === "line") return [r.new != null ? keyOf("RIGHT", r.new) : null, r.old != null ? keyOf("LEFT", r.old) : null].filter(Boolean);
    return [r.right && keyOf("RIGHT", r.right.new), r.left && keyOf("LEFT", r.left.old)].filter(Boolean);
  }
  anchorKeyAt(i) { const it = this.items[i]; return it && this.isLine(it) ? this.keysOf(it)[0] : null; }

  toggleTree(cx) { this.treeOpen = !this.treeOpen; this.savePref("tree", this.treeOpen); cx.notify(); }

  wheel(e, cx) {
    let dx = e.delta.x, dy = e.delta.y;
    if (e.modifiers?.shift && !dx) { dx = dy; dy = 0; }
    const y = this.scrollY, x = this.scrollX;
    this.scrollY -= dy; this.scrollX -= dx;
    this.clampScroll();
    if (y !== this.scrollY || x !== this.scrollX) cx.notify();
    cx.stop_propagation();
  }

  rootMove(e, cx) {
    const d = this.drag;
    if (!d) return;
    if (d.kind === "tree") { this.treeW = clamp(d.w + e.position.x - d.x, 180, 640); cx.notify(); }
    else if (d.kind === "thumb") {
      const range = Math.max(1, this.viewH - d.thumb);
      this.scrollY = d.scroll + (e.position.y - d.y) * Math.max(0, this.total() - this.viewH + 40) / range;
      this.clampScroll(); cx.notify();
    } else if (d.kind === "treethumb") {
      const range = Math.max(1, this.treeH - d.thumb);
      this.treeY = clamp(d.scroll + (e.position.y - d.y) * Math.max(0, this.treeRows.length * TREE_ROW - this.treeH) / range, 0, Math.max(0, this.treeRows.length * TREE_ROW - this.treeH));
      cx.notify();
    }
  }

  // ---- drawing ------------------------------------------------------------------------

  render(cx) {
    const t = theme();
    const root = v_flex().id("review").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(13).track_focus(this.h)
      .on_key_down((e, cx) => this.key(e, cx))
      .on_mouse_move((e, cx) => this.rootMove(e, cx))
      .on_mouse_up("left", (_e, cx) => this.endDrag(cx))
      .on_hover((h, cx) => { if (!h && this.drag) this.endDrag(cx); });
    if (this.stage === "pick") return root.child(this.picker(t));
    if (this.stage !== "review") return root.child(this.centered(t));
    return root.relative()
      .child(this.header(t))
      .child(h_flex().flex_1().min_h(0).w_full()
        .when(this.treeOpen, (e) => e.child(this.tree(t)).child(this.treeDivider(t)))
        .child(v_flex().flex_1().min_w(0).h_full().child(this.fileHeader(t)).child(this.viewport(t))))
      .when(Boolean(this.submit), (e) => e.child(this.submitPanel(t)))
      .when(Boolean(this.help), (e) => e.child(this.helpPanel(t)))
      .when(Boolean(this.asking), (e) => e.child(this.askPanel(t)));
  }

  centered(t) {
    const loading = this.stage === "loading" || this.stage === "locating";
    return v_flex().size_full().items_center().justify_center().gap(12).p(24)
      .child(div().text_size(15).font_semibold().child(loading ? (this.loadingText ?? "Finding the repository…") : "Can't open this review"))
      .when(loading, (e) => e.child(div().text_color(t.dim).frames(["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], 90)))
      .when(!loading, (e) => e.child(div().max_w(560).text_color(t.muted).text_center().child(this.error ?? ""))
        .child(h_flex().gap(8)
          .child(this.button(t, "retry", "Try again", (_e, cx) => { if (this.repo && this.target) this.open(this.target, cx); else this.locate(cx); }))
          .when(Boolean(this.repo), (e) => e.child(this.button(t, "pick", "Choose another", (_e, cx) => { this.saveOwn("target", null); this.showPicker(cx); cx.notify(); }, "solid")))));
  }

  button(t, id, label, onClick, tone, icon) {
    const solid = tone === "solid", danger = tone === "danger", disabled = tone === "disabled";
    return h_flex().id(`btn-${id}`).h(28).px(10).gap(6).items_center().flex_none().rounded(6).text_size(12)
      .when(solid, (e) => e.bg(t.solid).text_color(t.solid_foreground))
      .when(!solid, (e) => e.border_1().border_color(t.border).bg(t.raised).text_color(danger ? t.ansi1 : disabled ? t.dim : t.foreground))
      .when(!disabled, (e) => e.cursor_pointer().hover((s) => s.bg(solid ? a(t.solid, "dd") : t.hover)))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .when(!disabled, (e) => e.on_click((ev, cx) => { onClick(ev, cx); }))
      .when(Boolean(icon), (e) => e.child(svg(ICON(icon)).size(14).text_color(solid ? t.solid_foreground : danger ? t.ansi1 : t.muted)))
      .when(label != null, (e) => e.child(label));
  }

  iconButton(t, id, icon, onClick, { active = false, tip, size = 28 } = {}) {
    return div().id(`ib-${id}`).size(size).flex().items_center().justify_center().flex_none().rounded(6).cursor_pointer()
      .when(active, (e) => e.bg(t.selected)).hover((s) => s.bg(t.hover))
      .when(Boolean(tip), (e) => e.tooltip(tip))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((ev, cx) => onClick(ev, cx))
      .child(svg(ICON(icon)).size(15).text_color(active ? t.foreground : t.muted));
  }

  badge(t, text, color) {
    return div().px(6).h(18).flex().items_center().flex_none().rounded(9).text_size(11).border_1().border_color(a(color, "66")).text_color(color).child(text);
  }

  // -- picker --

  picker(t) {
    const list = this.pickEntries();
    const sel = clamp(this.pickSel, 0, list.length - 1);
    const rows = [];
    let section = null;
    list.forEach((e, i) => {
      if (e.section !== section) { section = e.section; rows.push(div().px(12).pt(i ? 14 : 4).pb(6).text_size(11).font_semibold().text_color(t.dim).child(section.toUpperCase())); }
      rows.push(this.pickRow(t, e, i === sel, i));
    });
    if (this.prs === null) rows.push(div().px(12).py(8).text_color(t.dim).child("Loading pull requests…"));
    else if (this.prError) rows.push(div().px(12).py(8).text_color(t.dim).child(`Pull requests unavailable: ${this.prError}`));
    else if (!this.prs.length && !this.pickFilter) rows.push(div().px(12).py(8).text_color(t.dim).child("No open pull requests."));
    return v_flex().size_full().items_center().bg(t.canvas).p(24).child(
      v_flex().w_full().max_w(760).flex_1().min_h(0).gap(14)
        .child(h_flex().gap(10).items_center()
          .child(div().text_size(18).font_semibold().child("Review"))
          .child(div().text_color(t.dim).truncate().child(this.repo?.root.replace(/^\/Users\/[^/]+/, "~") ?? ""))
          .child(div().flex_1())
          .when(Boolean(this.review), (e) => e.child(this.button(t, "back", "Back to review", (_e, cx) => { this.stage = "review"; cx.notify(); }))))
        .child(div().id("pick-input").h(38).px(12).flex().items_center().rounded(8).border_1().border_color(this.typing === "pick" ? t.accent : t.border).bg(t.background)
          .child(Input.new(this.pickInput).w_full().text_size(13).text_color(t.foreground)))
        .child(this.agentChips(t))
        .child(v_flex().id("pick-list").flex_1().min_h(0).overflow_y_scrollbar().rounded(10).border_1().border_color(t.border).bg(t.background).p(6).children(rows))
        .child(div().text_size(11).text_color(t.dim).child("↑↓ choose · tab agent · enter open · a number, a PR link or a git ref works too")));
  }

  pickRow(t, e, selected, i) {
    const p = e.pr;
    return h_flex().id(`pick-${e.id}`).min_h(p ? 46 : 36).px(12).py(6).gap(10).items_center().rounded(7).cursor_pointer()
      .when(selected, (x) => x.bg(t.selected)).hover((s) => s.bg(t.hover))
      .on_click((_ev, cx) => { this.pickSel = i; this.choose(e.target, cx); })
      .child(div().w(44).flex_none().text_color(t.dim).text_size(12).child(p ? `#${p.number}` : e.id === "uncommitted" ? "●" : e.id === "base" ? "⑂" : "→"))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(8).items_center().min_w(0)
          .child(div().truncate().font_medium().child(e.title))
          .when(Boolean(p?.isDraft), (x) => x.child(this.badge(t, "Draft", t.dim)))
          .when(Boolean(p?.requested), (x) => x.child(this.badge(t, "Review requested", t.blocked)))
          .when(p?.reviewDecision === "APPROVED", (x) => x.child(this.badge(t, "Approved", t.ansi2)))
          .when(p?.reviewDecision === "CHANGES_REQUESTED", (x) => x.child(this.badge(t, "Changes requested", t.ansi1))))
        .child(div().text_size(11).text_color(t.dim).truncate().child(p ? `${p.author?.login ?? ""} · ${p.headRefName} → ${p.baseRefName} · updated ${ago(p.updatedAt)}` : e.meta ?? "")))
      .when(Boolean(p), (x) => x.child(div().text_size(11).text_color(t.ansi2).child(`+${p.additions}`)).child(div().text_size(11).text_color(t.ansi1).child(`−${p.deletions}`)));
  }

  // -- header --

  header(t) {
    const r = this.review, pr = r.pr;
    const add = r.files.reduce((n, f) => n + f.add, 0), del = r.files.reduce((n, f) => n + f.del, 0);
    const drafts = this.state.drafts.filter((d) => !d.proposed).length;
    const viewed = r.files.filter((f) => this.isViewed(f)).length;
    // Narrower panes drop the least useful parts first.
    const w = this.headerW ?? 1400, roomy = w >= 1150, mid = w >= 960, slim = w >= 820;
    return h_flex().id("header").h(44).flex_none().w_full().px(8).gap(6).items_center().bg(t.chrome).border_b(1).border_color(t.border).overflow_hidden()
      .on_size_change((sz, cx) => { if (Math.abs((this.headerW ?? 0) - sz.width) > 1) { this.headerW = sz.width; cx.notify(); } })
      .child(this.iconButton(t, "tree", "sidebar", (_e, cx) => this.toggleTree(cx), { active: this.treeOpen, tip: "Files (t)" }))
      .child(h_flex().flex_1().min_w(0).gap(8).items_center().px(4)
        .when(Boolean(pr), (e) => e
          .child(div().id("pr-link").text_color(t.dim).cursor_pointer().hover((s) => s.text_color(t.accent)).on_click((_e, cx) => cx.open_url(pr.url)).child(`#${pr.number}`))
          .child(div().font_semibold().truncate().min_w(0).child(pr.title))
          .when(pr.isDraft, (e) => e.child(this.badge(t, "Draft", t.dim)))
          .when(pr.state !== "OPEN", (e) => e.child(this.badge(t, pr.state === "MERGED" ? "Merged" : "Closed", pr.state === "MERGED" ? t.ansi5 : t.ansi1)))
          .when(roomy, (e) => e.child(div().flex_shrink(1).min_w(0).truncate().text_size(12).text_color(t.dim).child(`${pr.author} · ${pr.headRefName} → ${pr.baseRefName}`))))
        .when(!pr, (e) => e.child(div().font_semibold().truncate().min_w(0).child(r.title)).when(roomy, (e) => e.child(div().flex_shrink(1).min_w(0).truncate().text_size(12).text_color(t.dim).child(r.subtitle)))))
      .when(Boolean(this.busy) && typeof this.busy === "string", (e) => e.child(div().text_size(12).text_color(t.muted).child(this.busy)))
      .when(mid, (e) => e.child(div().flex_none().text_size(12).text_color(t.dim).child(`${viewed}/${r.files.length} viewed`))
        .child(div().flex_none().text_size(12).text_color(t.ansi2).child(`+${add}`))
        .child(div().flex_none().text_size(12).text_color(t.ansi1).child(`−${del}`)))
      .when(slim, (e) => e.child(h_flex().flex_none().h(28).p(2).rounded(7).bg(t.raised).border_1().border_color(t.border)
        .child(this.segment(t, "unified", "Unified", !this.split, (cx) => this.split && this.toggleSplit(cx)))
        .child(this.segment(t, "split", "Split", this.split, (cx) => !this.split && this.toggleSplit(cx)))))
      .child(this.iconButton(t, "refresh", "refresh", (_e, cx) => this.reload(cx), { tip: "Refresh (r)" }))
      .child(this.iconButton(t, "follow", "file", (_e, cx) => this.key({ keystroke: "f", key: "f", modifiers: {} }, cx), { active: this.follow && Boolean(this.ws?.nvimTerm), tip: this.follow ? "Neovim follows the cursor (f)" : "Neovim doesn't follow (f)" }))
      .child(this.agentButton(t))
      .child(this.button(t, "change", mid ? "Change" : null, (_e, cx) => { this.showPicker(cx); cx.notify(); }, null, mid ? null : "chevron-left"))
      .child(this.button(t, "finish", (r.kind === "pr" ? (slim ? "Review changes" : "Review") : "Finish") + (drafts ? ` (${drafts})` : ""), (_e, cx) => this.openSubmit(cx), "solid"))
      .child(this.iconButton(t, "help", "comment", (_e, cx) => { this.help = !this.help; cx.notify(); }, { tip: "Keys (?)", active: this.help }));
  }

  segment(t, id, label, on, act) {
    return div().id(`seg-${id}`).h_full().px(10).flex().items_center().rounded(5).text_size(12).cursor_pointer()
      .when(on, (e) => e.bg(t.background).text_color(t.foreground)).when(!on, (e) => e.text_color(t.muted).hover((s) => s.text_color(t.foreground)))
      .on_click((_e, cx) => act(cx)).child(label);
  }

  // -- tree --

  tree(t) {
    const rows = this.treeRows ?? [];
    const total = rows.length * TREE_ROW;
    this.treeY = clamp(this.treeY, 0, Math.max(0, total - this.treeH));
    const first = Math.floor(this.treeY / TREE_ROW), last = Math.min(rows.length - 1, Math.ceil((this.treeY + this.treeH) / TREE_ROW));
    const visible = [];
    for (let i = first; i <= last; i++) visible.push(this.treeRow(t, rows[i], i));
    const r = this.review, viewed = r.files.filter((f) => this.isViewed(f)).length;
    const thumb = total > this.treeH ? Math.max(24, this.treeH * this.treeH / total) : 0;
    return v_flex().w(this.treeW).flex_none().h_full().bg(t.chrome)
      .child(div().p(8).flex_none().child(div().id("tree-input").h(30).px(10).flex().items_center().rounded(7).border_1().border_color(this.typing === "tree" ? t.accent : t.border).bg(t.background)
        .child(Input.new(this.treeInput).w_full().text_size(12).text_color(t.foreground))))
      .child(div().id("tree-view").flex_1().min_h(0).relative().overflow_hidden()
        .on_size_change((s, cx) => { if (s.height !== this.treeH) { this.treeH = s.height; cx.notify(); } })
        .on_scroll_wheel((e, cx) => {
          const y = this.treeY;
          this.treeY = clamp(this.treeY - e.delta.y, 0, Math.max(0, total - this.treeH));
          if (y !== this.treeY) cx.notify();
          cx.stop_propagation();
        })
        .child(v_flex().absolute().w_full().top(first * TREE_ROW - this.treeY).children(visible))
        .when(thumb > 0, (e) => e.child(div().id("tree-thumb").absolute().right(1).w(6).rounded(3).bg(a(t.foreground, "30")).hover((s) => s.bg(a(t.foreground, "55")))
          .top(this.treeY / Math.max(1, total - this.treeH) * (this.treeH - thumb)).h(thumb)
          .on_mouse_down("left", (ev, cx) => { this.drag = { kind: "treethumb", y: ev.position.y, scroll: this.treeY, thumb }; cx.stop_propagation(); })))
        .when(!rows.length, (e) => e.child(div().p(12).text_color(t.dim).child(this.fileFilter ? "No files match." : "No changed files."))))
      .child(v_flex().flex_none().px(12).py(8).gap(6).border_t(1).border_color(t.border)
        .child(h_flex().text_size(11).text_color(t.dim).child(div().flex_1().child(`${viewed} of ${plural(r.files.length, "file")} viewed`)).child(div().child(r.files.length ? `${Math.round(100 * viewed / r.files.length)}%` : "")))
        .child(div().h(4).w_full().rounded(2).bg(t.raised).child(div().h_full().rounded(2).bg(t.ansi2).w(r.files.length ? `${100 * viewed / r.files.length}%` : "0%"))));
  }

  treeRow(t, row, i) {
    const pad = 8 + row.depth * 14;
    if (row.type === "dir") {
      return h_flex().id(`tr-${row.path}`).h(TREE_ROW).flex_none().pl(pad).pr(8).gap(5).items_center().cursor_pointer().hover((s) => s.bg(t.hover)).text_color(t.muted)
        .on_click((_e, cx) => { if (this.collapsedDirs.has(row.path)) this.collapsedDirs.delete(row.path); else this.collapsedDirs.add(row.path); this.buildTree(); cx.notify(); })
        .child(svg(ICON(row.open ? "chevron-down" : "chevron-right")).size(12).flex_none().text_color(t.dim))
        .child(svg(ICON("folder")).size(14).flex_none().text_color(t.dim))
        .child(div().truncate().min_w(0).text_size(12).child(row.name));
    }
    const f = row.file, on = f.path === this.path, viewed = this.isViewed(f), n = this.commentCount(f.path);
    const sc = { A: t.ansi2, D: t.ansi1, R: t.ansi4, C: t.ansi4, M: t.blocked }[f.status] ?? t.muted;
    return h_flex().id(`tf-${f.path}`).h(TREE_ROW).flex_none().pl(pad + 17).pr(8).gap(6).items_center().cursor_pointer()
      .when(on, (e) => e.bg(t.selected)).when(!on, (e) => e.hover((s) => s.bg(t.hover)))
      .on_click((_e, cx) => { this.selectFile(f.path, cx); this.h.focus(); })
      .child(div().w(10).flex_none().text_size(10).font_semibold().text_color(sc).child(f.status))
      .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(viewed && !on ? t.dim : t.foreground).when(viewed, (e) => e.line_through()).child(f.path.split("/").pop()))
      .when(n.t + n.d > 0, (e) => e.child(h_flex().gap(3).items_center().flex_none().text_size(11).text_color(n.d ? t.blocked : t.muted)
        .child(svg(ICON("comment")).size(12).text_color(n.d ? t.blocked : t.muted)).child(String(n.t + n.d))))
      .child(div().id(`tv-${f.path}`).size(16).flex_none().rounded(4).flex().items_center().justify_center().border_1()
        .border_color(viewed ? t.ansi2 : t.input ?? t.border).when(viewed, (e) => e.bg(t.ansi2))
        .tooltip(viewed ? "Viewed" : "Mark as viewed")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { this.toggleViewed(f.path, cx); })
        .when(viewed, (e) => e.child(svg(ICON("check")).size(12).text_color(t.background))));
  }

  treeDivider(t) {
    return div().id("tree-divider").w(5).h_full().flex_none().cursor_col_resize().relative()
      .child(div().absolute().left(0).top(0).bottom(0).w(1).bg(this.drag?.kind === "tree" ? t.accent : t.border))
      .on_mouse_down("left", (e, cx) => { this.drag = { kind: "tree", x: e.position.x, w: this.treeW }; cx.stop_propagation(); })
      .on_mouse_up("left", (_e, cx) => { this.savePref("treeW", this.treeW); this.endDrag(cx); });
  }

  // -- the file --

  fileHeader(t) {
    const f = this.fileMap.get(this.path);
    if (!f) return div();
    const order = this.fileOrder(), idx = order.indexOf(f.path);
    const parts = f.path.split("/"), name = parts.pop();
    const viewed = this.isViewed(f), total = f.add + f.del;
    const blocks = Array.from({ length: 5 }, (_, i) => {
      const g = total ? Math.round((f.add / total) * 5) : 0, r = total ? Math.min(5 - g, Math.round((f.del / total) * 5)) : 0;
      return i < g ? t.ansi2 : i < g + r ? t.ansi1 : t.raised;
    });
    const w = this.fileBarW ?? 1200, wide = w >= 620, roomy = w >= 760;
    return h_flex().id("file-bar").h(40).flex_none().w_full().px(10).gap(8).items_center().overflow_hidden().bg(t.surface ?? t.chrome).border_b(1).border_color(t.border)
      .on_size_change((sz, cx) => { if (Math.abs((this.fileBarW ?? 0) - sz.width) > 1) { this.fileBarW = sz.width; cx.notify(); } })
      .child(this.iconButton(t, "prev-file", "chevron-left", (_e, cx) => this.stepFile(-1, cx), { tip: "Previous file (shift-k)", size: 24 }))
      .when(wide, (e) => e.child(div().text_size(11).text_color(t.dim).flex_none().child(`${idx + 1} / ${order.length}`)))
      .child(this.iconButton(t, "next-file", "chevron-right", (_e, cx) => this.stepFile(1, cx), { tip: "Next file (shift-j)", size: 24 }))
      .when(Boolean(this.visual), (e) => e.child(div().flex_none().px(6).h(18).flex().items_center().rounded(4).bg(t.accent).text_color(t.accent_foreground).text_size(10).font_semibold().child("VISUAL")))
      .child(h_flex().flex_1().min_w(0).items_center().gap(0).font_family(this.codeFont()).text_size(12)
        .child(div().text_color(t.dim).truncate().min_w(0).flex_shrink(1).child(parts.length ? parts.join("/") + "/" : ""))
        .child(div().font_semibold().flex_shrink(1).min_w(0).truncate().child(name))
        .when(f.status === "R" || f.status === "C", (e) => e.child(div().pl(8).text_color(t.dim).truncate().child(`← ${f.oldPath}`)))
        .child(div().id("copy-path").ml(4).size(22).flex().items_center().justify_center().rounded(5).cursor_pointer().hover((s) => s.bg(t.hover)).tooltip("Copy path")
          .on_click((_e, cx) => { cx.write_to_clipboard(f.path); notify({ title: "Path copied", timeout: 1200 }); })
          .child(svg(ICON("copy")).size(13).text_color(t.dim))))
      .when(wide, (e) => e.child(div().flex_none().text_size(12).text_color(t.ansi2).child(`+${f.add}`))
        .child(div().flex_none().text_size(12).text_color(t.ansi1).child(`−${f.del}`)))
      .when(roomy, (e) => e.child(h_flex().flex_none().gap(1).children(blocks.map((c) => div().size(8).rounded(1).bg(c)))))
      .child(h_flex().id("viewed").flex_none().h(26).px(8).gap(6).items_center().rounded(6).cursor_pointer().border_1().tooltip("Viewed (x)")
        .border_color(viewed ? a(t.ansi2, "88") : t.border).when(viewed, (e) => e.bg(a(t.ansi2, "22")))
        .hover((s) => s.bg(t.hover)).on_click((_e, cx) => this.toggleViewed(f.path, cx))
        .child(div().size(14).rounded(3).flex().items_center().justify_center().border_1().border_color(viewed ? t.ansi2 : t.input ?? t.border).when(viewed, (e) => e.bg(t.ansi2))
          .when(viewed, (e) => e.child(svg(ICON("check")).size(11).text_color(t.background))))
        .when(wide, (e) => e.child(div().text_size(12).child("Viewed"))));
  }

  codeFont() { return settings().font_family ?? "JetBrains Mono"; }

  viewport(t) {
    const n = this.items.length;
    if (!n) return div().flex_1().p(24).text_color(t.dim).child(this.review.files.length ? "Select a file." : "No changes.");
    const first = this.itemAt(this.scrollY);
    const visible = [];
    for (let i = first; i < n && this.offsets[i] < this.scrollY + this.viewH + 200; i++) visible.push(this.item(t, i));
    const total = this.total(), max = Math.max(0, total - this.viewH + 40);
    const thumb = max > 0 ? Math.max(28, this.viewH * this.viewH / (total + 40)) : 0;
    const markers = [];
    if (thumb) this.items.forEach((it, i) => {
      if (it.type === "thread" || it.type === "draft" || it.type === "composer")
        markers.push(div().absolute().right(0).w(4).h(3).rounded(1).top((this.offsets[i] / (total + 40)) * this.viewH).bg(it.type === "thread" ? t.accent : t.blocked));
    });
    return div().id("viewport").flex_1().min_h(0).w_full().relative().overflow_hidden().bg(t.background)
      .on_size_change((s, cx) => { if (s.width !== this.viewW || s.height !== this.viewH) { this.viewW = s.width; this.viewH = s.height; this.clampScroll(); cx.notify(); } })
      .on_scroll_wheel((e, cx) => this.wheel(e, cx))
      .on_mouse_move((e, cx) => this.viewportMove(e, cx))
      .on_mouse_down("left", () => this.h.focus())
      .child(v_flex().absolute().w_full().top(this.offsets[first] - this.scrollY).children(visible))
      .when(thumb > 0, (e) => e.child(div().absolute().right(0).top(0).h_full().w(10).children(markers)
        .child(div().id("thumb").absolute().right(2).w(6).rounded(3).bg(a(t.foreground, this.drag?.kind === "thumb" ? "60" : "30")).hover((s) => s.bg(a(t.foreground, "55")))
          .top((this.scrollY / max) * (this.viewH - thumb)).h(thumb)
          .on_mouse_down("left", (ev, cx) => { this.drag = { kind: "thumb", y: ev.position.y, scroll: this.scrollY, thumb }; cx.stop_propagation(); }))));
  }

  // Measures a variable-height item so the layout learns its real size.
  measured(key, el) {
    return div().id(`m-${key}`).w_full().flex_none().on_size_change((s, cx) => {
      if (Math.abs((this.heights[key] ?? 0) - s.height) > 0.5) { this.heights[key] = s.height; this.layout(); cx.notify(); }
    }).child(el);
  }

  item(t, i) {
    const it = this.items[i];
    switch (it.type) {
      case "line": return this.lineRow(t, it, i);
      case "pair": return this.pairRow(t, it, i);
      case "gap": return this.gapRow(t, it, i);
      case "above": return this.measured(it.key, this.aboveRow(t, it));
      case "note": case "load": return this.measured(it.key, this.noteRow(t, it));
      case "thread": return this.measured(it.key, this.cardWrap(t, this.threadCard(t, it.thread)));
      case "draft": return this.measured(it.key, this.cardWrap(t, this.draftCard(t, it.draft)));
      case "composer": return this.measured(it.key, this.cardWrap(t, this.composerCard(t)));
      default: return div();
    }
  }

  colors(t) {
    return {
      add: a(t.ansi2, "1c"), del: a(t.ansi1, "1c"), addG: a(t.ansi2, "33"), delG: a(t.ansi1, "33"),
      addE: a(t.ansi2, "55"), delE: a(t.ansi1, "55"), sel: a(t.accent, "2e"), selG: a(t.accent, "66"),
      syn: { comment: t.dim, string: t.ansi2, number: t.ansi3, keyword: t.ansi5, type: t.ansi3, function: t.ansi4, constant: t.ansi1, meta: t.ansi6, tag: t.ansi1, attr: t.ansi1, heading: t.ansi1 },
    };
  }

  // Text with syntax colors and word-level change marks.
  spans(t, l, C, emphBg, cur = null) {
    const text = l.text ?? "";
    const focused = this.h.is_focused?.() ?? true;
    const block = (ch) => {
      // Exactly the row's height inside, so the row never cuts its top off.
      const el = div().flex_none().h(LH - 4).flex().items_center().whitespace_nowrap().rounded(1).child(ch);
      return focused ? el.bg(t.accent).text_color(t.accent_foreground) : el.border_1().border_color(t.accent);
    };
    if (!text) return [cur != null ? block(" ") : div().child(" ")];
    const cuts = new Set([0, text.length]);
    if (cur != null && cur < text.length) { cuts.add(cur); cuts.add(cur + 1); }
    const tok = l.tok ?? [];
    for (const [s, e] of tok) { cuts.add(Math.min(s, text.length)); cuts.add(Math.min(e, text.length)); }
    for (const [s, e] of l.emph ?? []) { cuts.add(s); cuts.add(e); }
    const pts = [...cuts].sort((x, y) => x - y);
    const out = [];
    let ti = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const s = pts[k], e = pts[k + 1];
      if (e <= s) continue;
      while (ti < tok.length && tok[ti][1] <= s) ti++;
      const cls = ti < tok.length && tok[ti][0] <= s ? tok[ti][2] : null;
      if (cur === s && e === s + 1) { out.push(block(text.slice(s, e))); continue; }
      const em = (l.emph ?? []).some(([x, y]) => s >= x && e <= y);
      let el = div().flex_none().whitespace_nowrap().child(text.slice(s, e));
      if (cls) el = el.text_color(C.syn[cls] ?? t.foreground);
      if (cls === "comment") el = el.italic();
      if (cls === "heading") el = el.font_semibold();
      if (em) el = el.bg(emphBg).rounded(2);
      out.push(el);
    }
    if (cur != null && cur >= text.length) out.push(block(" "));
    return out;
  }

  gutter(t, i, side, num, bg, selected, C, cur = false) {
    return div().id(`g-${i}-${side}`).w(this.gutterW).h_full().flex_none().pr(8).flex().items_center().justify_end().text_color(selected || cur ? t.foreground : t.dim)
      .when(Boolean(bg), (e) => e.bg(bg)).when(selected, (e) => e.bg(C.selG)).when(cur && !selected, (e) => e.font_semibold().bg(a(t.accent, "33")))
      .cursor_pointer().hover((s) => s.bg(t.accent).text_color(t.accent_foreground))
      .on_mouse_down("left", (e, cx) => { this.gutterDown(i, side, e, cx); cx.stop_propagation(); })
      .child(num == null ? "" : String(num));
  }

  code(t, i, side, l, C, bg, emphBg) {
    return div().flex_1().min_w(0).h_full().overflow_hidden()
      .on_mouse_down("left", (e, cx) => {
        this.cursor = i; this.side = side; this.sel = null; this.visual = false;
        const c = Math.floor(((e.local_position?.x ?? 0) + this.scrollX) / this.charW());
        this.wantCol = Math.max(0, c); this.fitCol();
        this.h.focus(); cx.notify();
      })
      .child(h_flex().relative().left(-this.scrollX).h_full().items_center().children(l ? this.spans(t, l, C, emphBg, i === this.cursor && side === (this.split ? this.side : "RIGHT") ? this.col : null) : []));
  }

  lineRow(t, it, i) {
    const r = it.row, C = this.colors(t);
    const bg = r.kind === "+" ? C.add : r.kind === "-" ? C.del : null;
    const gbg = r.kind === "+" ? C.addG : r.kind === "-" ? C.delG : null;
    const selected = this.inSel(i), cur = i === this.cursor;
    return h_flex().id(`row-${i}`).w_full().h(LH).flex_none().relative().font_family(this.codeFont()).text_size(CODE_SIZE)
      .when(Boolean(bg), (e) => e.bg(bg))
      .when(r.hunk < 0, (e) => e.bg(a(t.canvas ?? t.background, "80")))
      .when(cur && !bg, (e) => e.bg(a(t.foreground, "0f")))
      .when(selected, (e) => e.bg(C.sel))
      .child(this.gutter(t, i, "LEFT", r.old, gbg, selected, C, cur))
      .child(this.gutter(t, i, "RIGHT", r.new, gbg, selected, C, cur))
      .child(div().w(16).flex_none().text_color(r.kind === "+" ? t.ansi2 : r.kind === "-" ? t.ansi1 : t.dim).pl(4).child(r.kind === " " ? "" : r.kind))
      .child(this.code(t, i, "RIGHT", r, C, bg, r.kind === "+" ? C.addE : C.delE))
      .when(i === this.cursor, (e) => e.child(div().absolute().left(0).top(0).w(3).h_full().bg(t.accent)));
  }

  pairRow(t, it, i) {
    const r = it.row, C = this.colors(t);
    const half = (side, l) => {
      const kind = l?.kind;
      const changed = side === "LEFT" ? kind === "-" : kind === "+";
      const bg = !l ? a(t.raised, "80") : changed ? (side === "LEFT" ? C.del : C.add) : null;
      const gbg = changed ? (side === "LEFT" ? C.delG : C.addG) : null;
      const selected = this.inSel(i, side);
      const cursor = i === this.cursor && this.side === side;
      return h_flex().flex_1().min_w(0).h_full().relative()
        .when(Boolean(bg), (e) => e.bg(bg))
        .when(l?.hunk < 0, (e) => e.bg(a(t.canvas ?? t.background, "80")))
        .when(cursor && !bg, (e) => e.bg(a(t.foreground, "0f")))
        .when(selected, (e) => e.bg(C.sel))
        .child(l ? this.gutter(t, i, side, side === "LEFT" ? l.old : l.new, gbg, selected, C, cursor) : div().w(this.gutterW).flex_none())
        .child(div().w(16).flex_none().pl(4).text_color(side === "LEFT" ? t.ansi1 : t.ansi2).child(changed ? kind : ""))
        .child(this.code(t, i, side, l, C, bg, side === "LEFT" ? C.delE : C.addE))
        .when(cursor, (e) => e.child(div().absolute().left(0).top(0).w(3).h_full().bg(t.accent)));
    };
    return h_flex().id(`row-${i}`).w_full().h(LH).flex_none().font_family(this.codeFont()).text_size(CODE_SIZE)
      .child(half("LEFT", r.left))
      .child(div().w(1).h_full().flex_none().bg(t.border))
      .child(half("RIGHT", r.right));
  }

  gapRow(t, it, i) {
    const g = it.row;
    const btn = (how, icon, tip) => div().id(`gx-${i}-${how}`).w(this.split ? this.gutterW : this.gutterW).h_full().flex().items_center().justify_center().cursor_pointer()
      .tooltip(tip).hover((s) => s.bg(t.accent).text_color(t.accent_foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => this.expandGap(g, how, cx)).child(svg(ICON(icon)).size(14).text_color(t.muted));
    const buttons = [];
    if (g.canExpand) {
      if (g.size <= EXPAND_STEP) buttons.push(btn("all", "unfold", `Expand ${plural(g.size, "line")}`));
      else {
        if (!g.first) buttons.push(btn("down", "arrow-down", `Expand ${EXPAND_STEP} lines down`));
        if (!g.last) buttons.push(btn("up", "arrow-up", `Expand ${EXPAND_STEP} lines up`));
      }
    }
    return h_flex().id(`row-${i}`).w_full().h(GAP_H).flex_none().items_center().bg(a(t.accent, "14")).font_family(this.codeFont()).text_size(CODE_SIZE).text_color(t.muted)
      .child(h_flex().w(2 * this.gutterW).h_full().flex_none().bg(a(t.accent, "1c")).children(buttons))
      .child(div().flex_1().min_w(0).pl(12).truncate().child(g.header ?? ""))
      .when(g.canExpand && g.size > EXPAND_STEP, (e) => e.child(div().id(`gx-${i}-all`).px(12).h_full().flex().items_center().cursor_pointer().text_size(11).hover((s) => s.text_color(t.accent))
        .on_click((_e, cx) => this.expandGap(g, "all", cx)).child(`Expand all ${g.size} lines`)));
  }

  aboveRow(t, it) {
    return h_flex().id("above").w_full().h(36).px(14).gap(8).items_center().cursor_pointer().bg(a(t.blocked, "14")).border_b(1).border_color(t.border).hover((s) => s.bg(a(t.blocked, "22")))
      .on_click((_e, cx) => { this.aboveOpen = !this.aboveOpen; this.rebuild(); cx.notify(); })
      .child(svg(ICON(this.aboveOpen ? "chevron-down" : "chevron-right")).size(12).text_color(t.muted))
      .child(svg(ICON("comment")).size(13).text_color(t.blocked))
      .child(div().text_size(12).text_color(t.muted).child(`${plural(it.n, "comment")} on outdated code or the whole file`));
  }

  noteRow(t, it) {
    return v_flex().w_full().p(20).gap(10).items_center().text_color(t.muted)
      .child(div().child(it.text))
      .when(it.type === "load", (e) => e.child(this.button(t, "load", "Load diff", (_e, cx) => { this.loadBig.add(this.path); this.rebuild(); this.loadContents(this.path, cx); cx.notify(); })));
  }

  cardWrap(t, card) {
    const indent = this.split ? 16 : 2 * this.gutterW + 16;
    return div().w_full().py(6).pl(indent).pr(20).bg(t.background).border_t(1).border_b(1).border_color(a(t.border, "88"))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_scroll_wheel((e, cx) => this.wheel(e, cx))
      .child(div().w_full().max_w(900).child(card));
  }

  avatar(t, login) {
    const colors = [t.ansi1, t.ansi2, t.ansi3, t.ansi4, t.ansi5, t.ansi6];
    const c = colors[hueOf(login) % colors.length];
    return div().size(22).flex_none().rounded(11).flex().items_center().justify_center().bg(a(c, "33")).text_color(c).text_size(11).font_semibold().child((login[0] ?? "?").toUpperCase());
  }

  rangeLabel(x) {
    const s = (side, n) => `${side === "LEFT" ? "L" : "R"}${n}`;
    if (x.startLine != null && !x.startSide) x = { ...x, startSide: x.side };
    return x.startLine != null && (x.startLine !== x.line || x.startSide !== x.side) ? `lines ${s(x.startSide, x.startLine)}–${s(x.side, x.line)}` : `line ${s(x.side, x.line)}`;
  }

  // The lines a suggestion replaces, for showing it as a change.
  suggestTarget(path, x) {
    const f = this.fileMap.get(path);
    if (!f || x.side !== "RIGHT") return null;
    const from = x.startSide === "RIGHT" && x.startLine != null ? x.startLine : x.line;
    const out = [];
    for (let n = from; n <= x.line; n++) {
      const raw = this.lineText(f, "RIGHT", n) ?? this.cache.get(path)?.newLines?.[n - 1];
      if (raw == null) return null;
      out.push(raw);
    }
    return out;
  }

  // A comment body: markdown, with ```suggestion blocks drawn as the change they make.
  body(t, id, text, path, x) {
    const parts = text.split(/```suggestion[^\n]*\n([\s\S]*?)\n?```/g);
    const out = [];
    parts.forEach((p, i) => {
      if (i % 2 === 0) { if (p.trim()) out.push(TextView.markdown(`${id}-md${i}`, p.trim()).selectable(true).w_full()); return; }
      const before = this.suggestTarget(path, x) ?? [];
      const after = p === "" ? [] : p.split("\n");
      const C = this.colors(t);
      const line = (txt, add) => h_flex().w_full().min_h(LH).px(8).bg(add ? C.add : C.del)
        .child(div().w(14).flex_none().text_color(add ? t.ansi2 : t.ansi1).child(add ? "+" : "-"))
        .child(div().flex_1().min_w(0).whitespace_nowrap().overflow_hidden().child(txt.replace(/\t/g, "    ") || " "));
      out.push(v_flex().w_full().rounded(6).border_1().border_color(t.border).overflow_hidden()
        .child(h_flex().h(28).px(10).gap(6).items_center().bg(t.raised).text_size(12).text_color(t.muted).child(svg(ICON("suggest")).size(13).text_color(t.muted)).child("Suggested change"))
        .child(v_flex().w_full().py(4).font_family(this.codeFont()).text_size(CODE_SIZE)
          .children([...before.map((l) => line(l, false)), ...after.map((l) => line(l, true))])));
    });
    return v_flex().w_full().gap(8).children(out);
  }

  threadCard(t, th) {
    const collapsed = th.resolved && !this.openThreads.has(th.id);
    const head = th.comments[0];
    const card = v_flex().w_full().rounded(8).border_1().border_color(t.border).bg(t.surface ?? t.raised).overflow_hidden();
    const top = h_flex().id(`th-${th.id}`).h(36).px(12).gap(8).items_center().cursor_pointer().bg(t.raised).hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { if (this.openThreads.has(th.id)) this.openThreads.delete(th.id); else this.openThreads.add(th.id); this.rebuild(); cx.notify(); })
      .child(svg(ICON(collapsed ? "chevron-right" : "chevron-down")).size(12).text_color(t.dim))
      .child(div().text_size(12).text_color(t.muted).child(th.file ? "File comment" : th.outdated ? `Outdated · was ${this.rangeLabel({ side: th.side, line: th.originalLine, startSide: th.startSide, startLine: th.originalStartLine })}` : `Comment on ${this.rangeLabel(th)}`))
      .when(collapsed && Boolean(head), (e) => e.child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(`${head.author}: ${head.body.replace(/```suggestion[\s\S]*?```/g, "(suggestion)").replace(/[*_`#>]/g, "").split("\n").find((l) => l.trim()) ?? ""}`)))
      .when(!collapsed, (e) => e.child(div().flex_1()))
      .when(th.resolved, (e) => e.child(this.badge(t, "Resolved", t.ansi2)))
      .when(th.comments.some((c) => c.pending), (e) => e.child(this.badge(t, "Pending", t.blocked)))
      .child(div().text_size(11).text_color(t.dim).child(plural(th.comments.length, "comment")));
    if (collapsed) return card.child(top);
    const comments = th.comments.map((c) => v_flex().w_full().px(14).py(10).gap(6).border_t(1).border_color(a(t.border, "88"))
      .child(h_flex().gap(8).items_center()
        .child(this.avatar(t, c.author))
        .child(div().font_semibold().text_size(12).child(c.author))
        .child(div().text_size(11).text_color(t.dim).child(ago(c.at)))
        .when(c.pending, (e) => e.child(this.badge(t, "Pending", t.blocked))))
      .child(div().pl(30).w_full().child(this.body(t, `c-${c.id}`, c.body, th.path, th))));
    const outdatedHunk = th.outdated && head?.diffHunk ? this.hunkPreview(t, head.diffHunk) : null;
    const replying = this.replying?.thread === th.id;
    const foot = h_flex().w_full().px(12).py(10).gap(8).items_start().border_t(1).border_color(t.border).bg(t.raised)
      .child(replying
        ? v_flex().flex_1().min_w(0).gap(8)
          .child(this.textareaBox(t, this.replying.state))
          .child(h_flex().gap(8).child(div().flex_1().text_size(11).text_color(t.dim).child("⌘↵ to reply · posts now"))
            .child(this.button(t, `rc-${th.id}`, "Cancel", (_e, cx) => this.endReply(cx)))
            .child(this.button(t, `rs-${th.id}`, "Reply", (_e, cx) => this.sendReply(cx), "solid")))
        : div().id(`rp-${th.id}`).flex_1().h(30).px(10).flex().items_center().rounded(6).border_1().border_color(t.border).bg(t.background).text_color(t.dim).text_size(12).cursor_text()
          .when(th.canReply !== false, (e) => e.on_click((_e, cx) => this.startReply(th, cx)).child("Reply…"))
          .when(th.canReply === false, (e) => e.child("You can't reply to this conversation")))
      .when((th.resolved ? th.canUnresolve : th.canResolve) !== false && !replying, (e) => e.child(this.button(t, `res-${th.id}`, th.resolved ? "Unresolve" : "Resolve conversation", (_e, cx) => this.toggleResolved(th, cx))));
    return card.child(top).when(Boolean(outdatedHunk), (e) => e.child(outdatedHunk)).children(comments).child(foot);
  }

  hunkPreview(t, hunk) {
    const C = this.colors(t);
    const lines = hunk.split("\n").slice(-6);
    return v_flex().w_full().py(4).font_family(this.codeFont()).text_size(CODE_SIZE).border_t(1).border_color(a(t.border, "88")).children(lines.map((l) => {
      const k = l[0];
      return div().w_full().min_h(LH).px(12).whitespace_nowrap().overflow_hidden().text_color(k === "@" ? t.dim : t.foreground)
        .when(k === "+", (e) => e.bg(C.add)).when(k === "-", (e) => e.bg(C.del)).child(l.replace(/\t/g, "    ") || " ");
    }));
  }

  draftCard(t, d) {
    const C = this.colors(t);
    const tone = d.proposed ? t.accent : t.blocked, who = d.by ?? this.review.viewer ?? "You";
    return v_flex().w_full().rounded(8).border_1().border_color(a(tone, "77")).bg(t.surface ?? t.raised).overflow_hidden()
      .child(h_flex().h(36).px(12).gap(8).items_center().bg(a(tone, "14"))
        .child(this.avatar(t, who))
        .child(div().font_semibold().text_size(12).flex_shrink(1).min_w(0).truncate().child(who))
        .child(this.badge(t, d.proposed ? "Suggested" : d.by ? "Kept" : this.review.kind === "pr" ? "Pending" : "Note", tone))
        .when(this.viewW > 760, (e) => e.child(div().text_size(11).text_color(t.dim).flex_none().child(this.rangeLabel(d))))
        .child(div().flex_1())
        .when(Boolean(d.proposed), (e) => e.child(this.button(t, `dk-${d.id}`, "Keep", (_e, cx) => this.keepDraft(d, cx), "solid")))
        .child(this.button(t, `de-${d.id}`, "Edit", (_e, cx) => this.editDraft(d, cx)))
        .child(this.button(t, `dd-${d.id}`, d.proposed ? "Discard" : "Delete", (_e, cx) => this.deleteDraft(d, cx), "danger")))
      .when(Boolean(d.outdated), (e) => e.child(v_flex().w_full().px(14).pt(10).gap(6)
        .child(div().text_size(12).text_color(t.blocked).child("The code this was written on has changed. It won't be posted; edit it onto a current line or delete it."))
        .child(v_flex().w_full().rounded(6).border_1().border_color(t.border).py(4).font_family(this.codeFont()).text_size(CODE_SIZE)
          .children((d.snippet ?? []).map((s) => div().px(10).min_h(LH).whitespace_nowrap().overflow_hidden().when(s.side === "LEFT", (e) => e.bg(C.del)).child((s.raw ?? "").replace(/\t/g, "    ") || " "))))))
      .child(div().w_full().px(14).py(10).child(this.body(t, `d-${d.id}`, d.body, d.path, d)));
  }

  textareaBox(t, state) {
    return div().w_full().px(10).py(8).rounded(6).border_1().border_color(this.typing === "text" ? t.accent : t.border).bg(t.background).cursor_text()
      .child(Textarea.new(state).w_full().text_size(13).text_color(t.foreground));
  }

  composerCard(t) {
    if (this.composer.ask) return this.askCard(t);
    const c = this.composer, pr = this.review.kind === "pr";
    const starting = pr && !this.state.drafts.length && !this.review.pr.pending;
    const narrow = this.viewW < 900;
    return v_flex().w_full().rounded(8).border_1().border_color(t.accent).bg(t.surface ?? t.raised).overflow_hidden()
      .child(h_flex().h(34).px(8).gap(2).items_center().bg(t.raised).border_b(1).border_color(t.border)
        .child(this.segment(t, "write", "Write", !c.preview, (cx) => { c.preview = false; this.focusLater(cx, c.state); cx.notify(); }))
        .child(this.segment(t, "preview", "Preview", c.preview, (cx) => { c.preview = true; cx.notify(); }))
        .child(div().flex_1())
        .child(div().text_size(11).text_color(t.dim).pr(6).child(`${c.editing ? "Editing" : "Commenting on"} ${this.rangeLabel(c)}`)))
      .child(v_flex().w_full().p(10).gap(8)
        .child(c.preview
          ? div().w_full().min_h(80).px(4).child(c.state.value().trim() ? this.body(t, "preview", c.state.value(), c.path, c) : div().text_color(t.dim).child("Nothing to preview."))
          : this.textareaBox(t, c.state))
        .child(h_flex().w_full().gap(8).items_center().flex_wrap()
          .when(Boolean(c.suggest), (e) => e.child(this.button(t, "suggest", "Suggestion", (_e, cx) => this.insertSuggestion(cx), null, "suggest")))
          .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child("Markdown · ⌘↵ to add"))
          .child(h_flex().gap(8).flex_none().ml_auto()
            .child(this.button(t, "cancel", "Cancel", (_e, cx) => this.cancelComposer(cx)))
            .when(pr && !c.editing, (e) => e.child(this.button(t, "single", narrow ? "Comment now" : "Add single comment", (_e, cx) => this.postNow(cx))))
            .child(this.button(t, "save", c.editing ? "Update" : pr ? (starting ? "Start a review" : narrow ? "Add to review" : "Add review comment") : "Add comment", (_e, cx) => this.saveComposer(cx), "solid")))));
  }

  // The question box: anchored to lines like a comment, but it goes to the agent.
  askCard(t) {
    const c = this.composer, name = this.ws?.agent?.name ?? "the agent";
    return v_flex().w_full().rounded(8).border_1().border_color(t.ansi5).bg(t.surface ?? t.raised).overflow_hidden()
      .child(h_flex().h(34).px(12).gap(8).items_center().bg(a(t.ansi5, "1a")).border_b(1).border_color(t.border)
        .child(svg(ICON("comment")).size(13).text_color(t.ansi5))
        .child(div().text_size(12).font_semibold().child(`Ask ${name}`))
        .child(div().flex_1())
        .child(div().text_size(11).text_color(t.dim).child(`About ${this.rangeLabel(c)} · the code goes with it`)))
      .child(v_flex().w_full().p(10).gap(8)
        .child(this.textareaBox(t, c.state))
        .child(h_flex().w_full().gap(8).items_center()
          .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child("⌘↵ to ask · the answer shows in the agent's pane"))
          .child(this.button(t, "ask-cancel", "Cancel", (_e, cx) => this.cancelComposer(cx)))
          .child(this.button(t, "ask-go", "Ask", (_e, cx) => this.askFromComposer(cx), "solid"))));
  }

  // -- finishing --

  submitPanel(t) {
    const s = this.submit, r = this.review, pr = r.pr;
    const proposed = this.state.drafts.filter((d) => d.proposed).length;
    const live = this.state.drafts.filter((d) => !d.outdated && !d.proposed).length, stale = this.state.drafts.length - live - proposed;
    const pendingN = pr?.pending?.comments?.totalCount ?? 0;
    const option = (event, title, about, disabled) => h_flex().id(`ev-${event}`).w_full().px(10).py(8).gap(10).items_start().rounded(7).cursor_pointer()
      .when(s.event === event, (e) => e.bg(t.selected)).when(!disabled, (e) => e.hover((x) => x.bg(t.hover)))
      .when(!disabled, (e) => e.on_click((_e, cx) => { s.event = event; cx.notify(); }))
      .child(div().mt(2).size(14).flex_none().rounded(7).border_1().border_color(s.event === event ? t.accent : t.input ?? t.border).flex().items_center().justify_center()
        .when(s.event === event, (e) => e.child(div().size(6).rounded(3).bg(t.accent))))
      .child(v_flex().gap(2).child(div().font_semibold().text_size(13).text_color(disabled ? t.dim : t.foreground).child(title)).child(div().text_size(11).text_color(t.dim).child(about)));
    return div().absolute().top(48).right(12).w(440).rounded(10).border_1().border_color(t.border).bg(t.popover ?? t.surface).shadow_lg()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(v_flex().w_full().p(14).gap(10)
        .child(h_flex().items_center().child(div().flex_1().font_semibold().text_size(14).child(pr ? "Finish your review" : "Your notes"))
          .child(this.iconButton(t, "close-submit", "x", (_e, cx) => this.closeSubmit(cx), { size: 24 })))
        .child(this.textareaBox(t, s.state))
        .child(div().text_size(12).text_color(t.muted).child(
          pr ? `${plural(live, "pending comment")}${pendingN ? ` + ${pendingN} already pending on GitHub` : ""} will be posted.${stale ? ` ${stale} on changed code will stay here.` : ""}${proposed ? ` ${proposed} the agent suggested aren't kept yet and won't be posted.` : ""}`
            : `${plural(this.state.drafts.length, "comment")}. Copy them as markdown to hand to an agent or paste anywhere.`))
        .when(Boolean(pr), (e) => e
          .child(option("COMMENT", "Comment", "Submit general feedback without explicit approval.", false))
          .child(option("APPROVE", "Approve", pr.viewerDidAuthor ? "You can't approve your own pull request." : "Submit feedback and approve merging these changes.", pr.viewerDidAuthor))
          .child(option("REQUEST_CHANGES", "Request changes", pr.viewerDidAuthor ? "You can't request changes on your own pull request." : "Submit feedback that must be addressed before merging.", pr.viewerDidAuthor)))
        .when(Boolean(s.error), (e) => e.child(div().text_size(12).text_color(t.ansi1).child(s.error)))
        .child(h_flex().gap(8).items_center()
          .when(!pr, (e) => e.child(this.button(t, "clear", "Clear all", (_e, cx) => this.clearDrafts(cx), "danger")))
          .when(proposed > 0, (e) => e.child(this.button(t, "keep-all", `Keep all ${proposed}`, (_e, cx) => { for (const d of this.state.drafts) delete d.proposed; this.saveState(cx); this.rebuild(); cx.notify(); })))
          .when(Boolean(pr && this.ws?.dir && this.ws.dir === ag.worktreePath(this.repo, r)), (e) => e.child(this.button(t, "rm-wt", "Remove worktree", (_e, cx) => this.dropWorktree(cx))))
          .child(div().flex_1())
          .child(this.button(t, "cancel-submit", "Cancel", (_e, cx) => this.closeSubmit(cx)))
          .child(this.button(t, "do-submit", pr ? (typeof this.busy === "string" ? this.busy : "Submit review") : "Copy as markdown", (_e, cx) => this.doSubmit(cx), this.busy ? "disabled" : "solid"))));
  }

  helpPanel(t) {
    return div().absolute().top(48).right(12).w(360).rounded(10).border_1().border_color(t.border).bg(t.popover ?? t.surface).shadow_lg()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .child(v_flex().w_full().p(14).gap(4)
        .child(h_flex().items_center().pb(6).child(div().flex_1().font_semibold().child("Keys")).child(this.iconButton(t, "close-help", "x", (_e, cx) => { this.help = false; cx.notify(); }, { size: 24 })))
        .children(HELP.map(([k, what]) => h_flex().gap(10).text_size(12)
          .child(div().w(140).flex_none().font_family(this.codeFont()).text_color(t.muted).child(k))
          .child(div().text_color(t.foreground).child(what)))));
  }
}
