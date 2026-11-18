// mine's pane header; props: { pane, terminal }.
// Cloned from Herdr's terminals-pane; colors now come from the theme.
// The camera button screenshots this pane (shot.sh): saved with the Mac's screenshots and copied.
// mine-pane.shot (⌘⇧2) does the same for the focused pane, found by its focus frame.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home, appHome, exec, notify, theme, nextCommand, window as win } from "herdr";


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

  init(_props, cx) {
    // Every header gets the command; the focused pane's takes the shot.
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "shot" && this.me()?.focused && this.width) this.shot(cx, ["--focused", theme().accent.slice(0, 7), String(this.width)]);
      }
    });
  }

  // Screenshot this pane: from the header's bounds (a press on it), or as given.
  shot(cx, args) {
    const b = this.bounds;
    if (!args && !b) return;
    cx.spawn(async () => {
      try {
        const r = await exec(`${appHome()}/mods/mine-pane/shot.sh`, args ?? [String(b.x), String(b.y), String(b.width)]);
        if (r.code !== 0) throw new Error((r.stderr || r.stdout).trim());
        const path = r.stdout.trim();
        notify({ title: "Pane screenshot copied", body: path.replace(home(), "~"), level: "success", timeout: 4000 });
      } catch (err) {
        notify({ title: "Pane screenshot failed", body: String(err?.message ?? err), level: "error" });
      }
    });
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
      .on_size_change((size) => {
        this.width = size.width;
      })
      // Every press here reports where the header is; the camera button uses it.
      .on_mouse_down("left", (e) => {
        if (e.bounds) this.bounds = e.bounds;
      })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(g?.icon), (el) =>
        el.child(g.tint ? svg(g.icon).size(16).flex_none().text_color(t.foreground) : image(g.icon).w(15).h(15).flex_none()),
      )
      .child(div().flex_none().max_w(320).truncate().font_semibold().text_color(p.focused ? t.foreground : t.muted).child(title))
      .child(div().flex_1().truncate().text_color(t.dim).child(dir))
      .child(
        div()
          .id(`th-c-${pane}`)
          .p(4)
          .rounded(5)
          .text_color(t.dim)
          .cursor_pointer()
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click((_e, cx) => {
            cx.stop_propagation();
            this.shot(cx);
          })
          .child(svg("mods/mine-pane/camera.svg").size(15)),
      )
      .child(this.button(t, `th-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
      .child(this.button(t, `th-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
      .child(this.button(t, `th-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
      .child(this.button(t, `th-x-${pane}`, "close", "pane.close", { pane }));
  }
}
