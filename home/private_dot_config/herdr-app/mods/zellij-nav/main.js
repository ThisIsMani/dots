import { View, div } from "gpui-kit";
import { run, focused, spaces, panes, terminals, hc, exec, nextCommand } from "herdr";

// Zellij-style navigation that Herdr has no single command for.
// Bind these in keys.json:
//   zellij-nav.left / zellij-nav.right   focus the pane that way, or the prev/next tab at the edge
//                                        (also while zoomed: the zoom moves along)
//   zellij-nav.up / zellij-nav.down      pane.go, also while zoomed (the zoom moves along)
//   zellij-nav.new                       split along the focused pane's longer side
//   zellij-nav.tab-left / tab-right      move the shown tab one place, wrapping
//
// A mod only gets commands while it sits in a layout, so the layout carries it
// as a floating block that draws nothing.

// How much taller a terminal cell is than wide, measured on screen with this setup
// (JetBrainsMono Custom in Herdr: about 9.4 x 23.4 px). Change it with the font.
const CELL_RATIO = 2.5;

export default class ZellijNav extends View {
  init(_props, cx) {
    // Panes by when they last had focus (local ids, newest last), like pane.go's history.
    this.recent = [];
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "left" || c === "right") await this.focusOrTab(c, cx);
          else if (c === "up" || c === "down") await this.focusVertical(c);
          else if (c === "new") await this.newPane();
          else if (c === "tab-left") this.moveTab(-1);
          else if (c === "tab-right") this.moveTab(1);
        } catch (e) {
          console.log(`zellij-nav ${c}: ${e}`);
        }
      }
    });
  }

  // Left/right: the pane that way, or the previous/next tab at the edge.
  async focusOrTab(dir, cx) {
    const before = focused()?.pane;
    const toTab = () => run(dir === "left" ? "tab.prev" : "tab.next");
    if (!this.isZoomed()) {
      run("pane.go", { direction: dir });
      // pane.go does nothing at the edge; give it a moment, then fall through to the tab.
      cx.timer.after(40, () => {
        if (focused()?.pane === before) toTab();
      });
      return;
    }
    const next = await this.zoomedNeighbor(dir);
    if (next === undefined) return; // split tree unavailable: do nothing rather than guess
    if (next) run("pane.focus", { pane: next });
    else toTab();
  }

  // Up/down: the pane that way; nothing at the edge.
  async focusVertical(dir) {
    if (!this.isZoomed()) {
      run("pane.go", { direction: dir });
      return;
    }
    const next = await this.zoomedNeighbor(dir);
    if (next) run("pane.focus", { pane: next });
  }

  isZoomed() {
    const f = focused();
    return !!f?.pane && panes().some((p) => p.tab === f.tab && p.zoomed);
  }

  // Zoomed, pane.go sees only the zoomed pane, so work out the neighbour from the tab's
  // split tree (herdr-core's "herdr-app" document); focusing it moves the zoom along with
  // no unzoom in between. Returns the pane id, null at an edge, undefined without a tree.
  async zoomedNeighbor(dir) {
    const f = focused();
    const space = spaces().find((s) => s.id === f.space);
    const root = await tabTree(f.tab, space?.machine ?? null);
    if (!root) return undefined;
    const rects = {};
    place(root, 0, 0, 1, 1, rects);
    const next = neighbor(rects, local(f.pane), dir, this.recent);
    if (!next) return null;
    // Pane ids from another machine carry a "<machine>/" prefix in panes().
    return panes().find((p) => local(p.pane) === next)?.pane ?? null;
  }

  async newPane() {
    const f = focused();
    if (!f?.pane) return; // a layout terminal block, not a tab pane
    let direction = "right";
    if (f.terminal) {
      let t = terminals().find((x) => x.address === f.terminal);
      if (t?.cols == null) {
        const r = await hc(["get", f.terminal, "--json"]);
        t = JSON.parse(r.stdout);
      }
      if (t?.cols && t?.rows && t.cols < t.rows * CELL_RATIO) direction = "down";
    }
    run("pane.split", { pane: f.pane, direction });
  }

  moveTab(delta) {
    const id = focused()?.tab;
    const space = spaces().find((s) => s.tabs.some((t) => t.id === id));
    if (!space || space.tabs.length < 2) return;
    const n = space.tabs.length;
    const tab = space.tabs.find((t) => t.id === id);
    const index = ((tab.index - 1 + delta + n) % n) + 1;
    run("tab.move", { id, index });
  }

  render() {
    // Runs on every focus change: note the focused pane.
    const p = focused()?.pane;
    if (p) {
      const id = local(p);
      if (this.recent[this.recent.length - 1] !== id) {
        this.recent = this.recent.filter((x) => x !== id);
        this.recent.push(id);
        if (this.recent.length > 200) this.recent.shift();
      }
    }
    return div();
  }
}

const local = (id) => (id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id);

// The tab's split tree from herdr-core's "herdr-app" document, or null.
async function tabTree(tabId, machine) {
  const params = { name: "herdr-app" };
  if (machine) params.on = machine;
  const req = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "doc.get", params });
  const r = await exec("sh", ["-c", 'printf "%s\\n" "$1" | hc connect', "sh", req], { timeout: 5000 });
  const line = r.stdout.split("\n").find((l) => l.includes('"id":1'));
  if (!line) return null;
  const id = local(tabId);
  for (const sp of JSON.parse(line).result?.value?.spaces ?? []) {
    for (const t of sp.tabs ?? []) if (t.id === id) return t.root;
  }
  return null;
}

// Lays the tree out in a unit square: rects[paneId] = [x0, y0, x1, y1].
// Weights share the space; px sizes are counted as weight 1 (only order matters here).
function place(node, x0, y0, x1, y1, rects) {
  if (node.type === "block") {
    rects[node.id] = [x0, y0, x1, y1];
    return;
  }
  const kids = node.children ?? [];
  const w = kids.map((k) => k.size?.weight ?? 1);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let at = node.type === "row" ? x0 : y0;
  kids.forEach((k, i) => {
    const span = ((node.type === "row" ? x1 - x0 : y1 - y0) * w[i]) / total;
    if (node.type === "row") place(k, at, y0, at + span, y1, rects);
    else place(k, x0, at, x1, at + span, rects);
    at += span;
  });
}

// The nearest pane in `dir` that shares some of the edge it is crossed through; among
// those on that nearest edge, the most recently focused, then the one sharing the most
// edge, then the topmost/leftmost.
function neighbor(rects, id, dir, recent = []) {
  const r = rects[id];
  if (!r) return null;
  const vertical = dir === "up" || dir === "down";
  const [lo, hi] = vertical ? [0, 2] : [1, 3]; // the shared axis: x for up/down, y for left/right
  const eps = 1e-6;
  let best = null;
  for (const [pid, c] of Object.entries(rects)) {
    if (pid === id) continue;
    const overlap = Math.min(r[hi], c[hi]) - Math.max(r[lo], c[lo]);
    if (overlap <= eps) continue;
    const gap = { down: c[1] - r[3], up: r[1] - c[3], right: c[0] - r[2], left: r[0] - c[2] }[dir];
    if (gap < -eps) continue;
    const score = [gap, -recent.indexOf(pid), -overlap, c[lo]];
    if (!best || before(score, best.score)) best = { pid, score };
  }
  return best?.pid ?? null;
}

// Lexicographic "a < b", treating near-equal numbers as equal.
function before(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-6) return a[i] < b[i];
  }
  return false;
}
