import { View, div } from "gpui-kit";
import { run, focused, spaces, panes, terminals, hc, nextCommand } from "herdr";

// Zellij-style navigation that Herdr has no single command for.
// Bind these in keys.json:
//   zellij-nav.left / zellij-nav.right   focus the pane that way, or the prev/next tab at the edge
//   zellij-nav.new                       split along the focused pane's longer side
//   zellij-nav.tab-left / tab-right      move the shown tab one place, wrapping
//
// A mod only gets commands while it sits in a layout, so the layout carries it
// as a floating block that draws nothing.

// A terminal cell is about twice as tall as it is wide.
const CELL_RATIO = 2;

export default class ZellijNav extends View {
  init(_props, cx) {
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        try {
          if (c === "left" || c === "right") this.focusOrTab(c, cx);
          else if (c === "new") await this.newPane();
          else if (c === "tab-left") this.moveTab(-1);
          else if (c === "tab-right") this.moveTab(1);
        } catch (e) {
          console.log(`zellij-nav ${c}: ${e}`);
        }
      }
    });
  }

  focusOrTab(dir, cx) {
    const before = focused()?.pane;
    const tab = focused()?.tab;
    const zoomed = panes().some((p) => p.tab === tab && p.zoomed);
    const toTab = () => run(dir === "left" ? "tab.prev" : "tab.next");
    if (!zoomed) {
      run("pane.go", { direction: dir });
      // pane.go does nothing at the edge; give it a moment, then fall through to the tab.
      cx.timer.after(40, () => {
        if (focused()?.pane === before) toTab();
      });
      return;
    }
    // Zoomed, as zellij's fullscreen: show the previous/next pane of the tab, still zoomed
    // (the zoom follows focus). Past the first or last pane, go to the tab.
    const list = panes().filter((p) => p.tab === tab);
    const next = list[list.findIndex((p) => p.pane === before) + (dir === "left" ? -1 : 1)];
    if (next) run("pane.focus", { pane: next.pane });
    else toTab();
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
    return div();
  }
}
