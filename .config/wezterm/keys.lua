local wezterm = require("wezterm")

local function move_or_create_pane(window, pane, direction)
  window:perform_action(wezterm.action({ ActivatePaneDirection = direction }), pane)

  local active_pane_id = window:active_pane():pane_id()

  if active_pane_id == pane:pane_id() then
    if direction == "Left" or direction == "Right" then
      window:perform_action(wezterm.action({ SplitHorizontal = { domain = "CurrentPaneDomain" } }), pane)
    elseif direction == "Up" or direction == "Down" then
      window:perform_action(wezterm.action({ SplitVertical = { domain = "CurrentPaneDomain" } }), pane)
    end
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
    key = "q",
    mods = "LEADER",
    action = wezterm.action.CloseCurrentPane({ confirm = true }),
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
