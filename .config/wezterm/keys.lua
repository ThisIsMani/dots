local wezterm = require("wezterm")

-- load plugin
local workspace_switcher = wezterm.plugin.require("https://github.com/MLFlexer/smart_workspace_switcher.wezterm")
-- set path to zoxide
workspace_switcher.zoxide_path = "/opt/homebrew/bin/zoxide"

local function move_or_create_pane(window, pane, direction)
  window:perform_action(wezterm.action({ ActivatePaneDirection = direction }), pane)

  local active_pane_id = window:active_pane():pane_id()

  if active_pane_id == pane:pane_id() then
    window:perform_action(wezterm.action({ SplitPane = { direction = direction } }), pane)
    window:perform_action(wezterm.action({ ActivatePaneDirection = direction }), pane)
  end
end

local keys = {
  {
    key = "h",
    mods = "LEADER",
    action = wezterm.action_callback(function(window, pane)
      move_or_create_pane(window, pane, "Left")
    end),
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
    action = wezterm.action_callback(function(window, pane)
      move_or_create_pane(window, pane, "Right")
    end),
  },
  {
    key = "j",
    mods = "LEADER",
    action = wezterm.action_callback(function(window, pane)
      move_or_create_pane(window, pane, "Down")
    end),
  },
  {
    key = "k",
    mods = "LEADER",
    action = wezterm.action_callback(function(window, pane)
      move_or_create_pane(window, pane, "Up")
    end),
  },
  {
    key = "k",
    mods = "CMD",
    action = wezterm.action.ClearScrollback("ScrollbackAndViewport"),
  },
  {
    key = "q",
    mods = "LEADER",
    action = wezterm.action.CloseCurrentPane({ confirm = true }),
  },
  {
    key = "z",
    mods = "LEADER",
    action = wezterm.action.TogglePaneZoomState,
  },
  {
    key = "s",
    mods = "LEADER",
    action = workspace_switcher.switch_workspace(),
  },
  {
    key = "t",
    mods = "LEADER",
    action = wezterm.action.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }),
  },
}

return keys
