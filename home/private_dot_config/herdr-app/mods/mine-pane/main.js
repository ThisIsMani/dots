// mine's pane header; props: { pane, terminal }.
// Cloned from Herdr's terminals-pane; colors now come from the theme.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home, theme, window as win } from "herdr";


function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class MinePane extends View {
  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, id, icon, command, args) {
    return div()
      .id(id)
      .p(4)
      .rounded(5)
      .text_color(t.dim)
      .cursor_pointer()
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/pane/${icon}.svg`).size(15));
  }

  render() {
    const p = this.me();
    if (!p) return div();
    const t = theme();
    // macOS window buttons sit over the top-left pane's header (the layout's traffic_lights):
    // the first pane of the tab, or the zoomed one.
    const w = win() ?? {};
    const mine = panes().filter((x) => x.tab === p.tab);
    const corner = (mine.find((x) => x.zoomed) ?? mine[0])?.pane === p.pane;
    const lights = corner && w.platform === "macos" && w.titlebar === "none" && !w.fullscreen;
    const pane = p.pane;
    const g = p.program;
    const where = folder(p.cwd);
    // Shells often put the folder in their title already.
    const title = p.title || "shell";
    const dir = where && !title.includes(where) && !/^[~/]/.test(title) ? where : "";
    return h_flex()
      .id(`tm-head-${pane}`)
      .size_full()
      .pl(lights ? 76 : 12)
      .pr(8)
      .gap(8)
      .items_center()
      .text_size(14)
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(g?.icon), (el) =>
        el.child(g.tint ? svg(g.icon).size(16).flex_none().text_color(t.foreground) : image(g.icon).w(15).h(15).flex_none()),
      )
      .child(div().flex_none().max_w(320).truncate().font_semibold().text_color(p.focused ? t.foreground : t.muted).child(title))
      .child(div().flex_1().truncate().text_color(t.dim).child(dir))
      .child(this.button(t, `th-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
      .child(this.button(t, `th-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
      .child(this.button(t, `th-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
      .child(this.button(t, `th-x-${pane}`, "close", "pane.close", { pane }));
  }
}
