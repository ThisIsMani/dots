local wezterm = require("wezterm")

local config = wezterm.config_builder()

local function get_appearance()
  if wezterm.gui then
    return wezterm.gui.get_appearance()
  end
  return "Dark"
end

local function scheme_for_appearance(appearance)
  if appearance:find("Dark") then
    return "OneDark (base16)"
  else
    return "One Light (base16)"
  end
end

config.font = wezterm.font("JetBrainsMono Nerd Font Mono", { weight = "Regular" })
config.harfbuzz_features = {
  "calt",
  "cv02",
  "cv03",
  "cv04",
  "cv05",
  "cv09",
  "cv10",
  "cv11",
  "cv12",
  "cv14",
  "cv16",
  "cv18",
  "cv19",
  "cv20",
  "zero",
}
config.font_size = 15.0

config.color_scheme = scheme_for_appearance(get_appearance())
local colors = wezterm.color.get_builtin_schemes()[config.color_scheme]

config.colors = {
  tab_bar = {
    background = colors.background,
  },
}

config.enable_tab_bar = false
-- config.use_fancy_tab_bar = false
-- config.tab_bar_at_bottom = true
-- config.show_new_tab_button_in_tab_bar = false
-- config.leader = { key = "'", mods = "CMD", timeout_milliseconds = 1000 }
-- config.keys = require("keys")
-- config.tab_max_width = 24
config.native_macos_fullscreen_mode = true
config.enable_kitty_keyboard = true

-- wezterm.on("format-tab-title", function(tab, tabs, panes, config, hover, max_width)
--   local edge_background = colors.background
--   local edge_foreground = colors.foreground
--   local background = colors.background
--   local foreground = colors.foreground
--
--   if tab.is_active or hover then
--     background = colors.foreground
--     foreground = colors.background
--   elseif hover then
--     background = colors.brights[1]
--     foreground = colors.brights[8]
--   end
--
--   local function tab_title(tab_info)
--     local title = tab_info.tab_title
--     if title and #title > 0 then
--       return title
--     end
--     return tab_info.active_pane.title
--   end
--
--   local title = tab_title(tab)
--
--   title = wezterm.truncate_right(title, max_width - 5)
--
--   return {
--     { Background = { Color = edge_background } },
--     { Foreground = { Color = edge_foreground } },
--     { Text = (tab.is_active or hover) and " " or "  " },
--     { Background = { Color = background } },
--     { Foreground = { Color = foreground } },
--     { Text = " " .. title .. " " },
--     { Background = { Color = edge_background } },
--     { Foreground = { Color = edge_foreground } },
--     { Text = (tab.is_active or hover) and "" or " " },
--   }
-- end)

wezterm.on("user-var-changed", function(window, pane, name, value)
  local overrides = window:get_config_overrides() or {}
  if name == "ZEN_MODE" then
    local incremental = value:find("+")
    local number_value = tonumber(value)
    if incremental ~= nil then
      window:perform_action(wezterm.action.SetPaneZoomState(true), pane)
      while number_value > 0 do
        number_value = number_value - 1
      end
      overrides.enable_tab_bar = false
    elseif number_value < 0 then
      window:perform_action(wezterm.action.SetPaneZoomState(false), pane)
      overrides.enable_tab_bar = true
    else
      window:perform_action(wezterm.action.SetPaneZoomState(true), pane)
      overrides.enable_tab_bar = false
    end
  end
  window:set_config_overrides(overrides)
end)

config.keys = {
  -- Remove the built-in “copy” binding so the key is forwarded
  { key = "c", mods = "CMD", action = wezterm.action.DisableDefaultAssignment },
}

-- print the workspace name at the upper right
-- wezterm.on("update-right-status", function(window, pane)
--   window:set_right_status(window:active_workspace())
-- end)
return config
