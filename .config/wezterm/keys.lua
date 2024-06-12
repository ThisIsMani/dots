local wezterm = require("wezterm")
local keys = {
  {
    key = "h",
    mods = "LEADER",
    action = wezterm.action.SplitPane({
      direction = "Left",
    }),
  },
  {
    key = "H",
    mods = "CMD",
    action = wezterm.action.ActivateTabRelative(-1),
  },
  {
    key = "L",
    mods = "CMD",
    action = wezterm.action.ActivateTabRelative(1),
  },
  {
    key = "{",
    mods = "CMD",
    action = wezterm.action.MoveTabRelative(-1),
  },
  {
    key = "}",
    mods = "CMD",
    action = wezterm.action.MoveTabRelative(1),
  },
  {
    key = "l",
    mods = "LEADER",
    action = wezterm.action.SplitPane({
      direction = "Right",
    }),
  },
  {
    key = "j",
    mods = "LEADER",
    action = wezterm.action.SplitPane({
      direction = "Down",
    }),
  },
  {
    key = "k",
    mods = "LEADER",
    action = wezterm.action.SplitPane({
      direction = "Up",
    }),
  },
  {
    key = "q",
    mods = "LEADER",
    action = wezterm.action.CloseCurrentPane({ confirm = true }),
  },
  {
    key = "h",
    mods = "ALT",
    action = wezterm.action.ActivatePaneDirection("Left"),
  },
  {
    key = "l",
    mods = "ALT",
    action = wezterm.action.ActivatePaneDirection("Right"),
  },
  {
    key = "k",
    mods = "ALT",
    action = wezterm.action.ActivatePaneDirection("Up"),
  },
  {
    key = "j",
    mods = "ALT",
    action = wezterm.action.ActivatePaneDirection("Down"),
  },
  {
    key = "LeftArrow",
    mods = "ALT",
    action = wezterm.action.AdjustPaneSize({ "Left", 5 }),
  },
  {
    key = "RightArrow",
    mods = "ALT",
    action = wezterm.action.AdjustPaneSize({ "Right", 5 }),
  },
  {
    key = "UpArrow",
    mods = "ALT",
    action = wezterm.action.AdjustPaneSize({ "Up", 5 }),
  },
  {
    key = "DownArrow",
    mods = "ALT",
    action = wezterm.action.AdjustPaneSize({ "Down", 5 }),
  },
  {
    key = "z",
    mods = "LEADER",
    action = wezterm.action.TogglePaneZoomState,
  },
}

return keys
