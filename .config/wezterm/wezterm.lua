local wezterm = require("wezterm")

local config = wezterm.config_builder()

function get_appearance()
  if wezterm.gui then
    return wezterm.gui.get_appearance()
  end
  return "Dark"
end

function scheme_for_appearance(appearance)
  if appearance:find("Dark") then
    return require("colors.dark")
  else
    return require("colors.light")
  end
end

local colors = scheme_for_appearance(get_appearance())

config.font = wezterm.font("JetBrainsMono Nerd Font Mono")
config.font_size = 15.0
config.colors = colors
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true
config.show_new_tab_button_in_tab_bar = false
config.leader = { key = "'", mods = "CMD", timeout_milliseconds = 1000 }
config.keys = require("keys")
config.tab_max_width = 24

function tab_title(tab_info)
  local title = tab_info.tab_title
  if title and #title > 0 then
    return title
  end
  return tab_info.active_pane.title
end

wezterm.on("format-tab-title", function(tab, tabs, panes, config, hover, max_width)
  local edge_background = colors.background
  local background = colors.background
  local foreground = colors.foreground

  if tab.is_active then
    background = colors.foreground
    foreground = colors.background
  elseif hover then
    background = colors.brights[1]
    foreground = colors.brights[8]
  end

  local edge_foreground = background

  local title = tab_title(tab)

  title = wezterm.truncate_right(title, max_width - 4)

  return {
    { Background = { Color = edge_background } },
    { Foreground = { Color = edge_foreground } },
    { Text = (tab.is_active or hover) and "" or " " },
    { Background = { Color = background } },
    { Foreground = { Color = foreground } },
    { Text = " " .. title .. " " },
    { Background = { Color = edge_background } },
    { Foreground = { Color = edge_foreground } },
    { Text = (tab.is_active or hover) and "" or " " },
  }
end)

wezterm.on("user-var-changed", function(window, pane, name, value)
  local overrides = window:get_config_overrides() or {}
  if name == "ZEN_MODE" then
    local incremental = value:find("+")
    local number_value = tonumber(value)
    if incremental ~= nil then
      while number_value > 0 do
        window:perform_action(wezterm.action.IncreaseFontSize, pane)
        number_value = number_value - 1
      end
      overrides.enable_tab_bar = false
    elseif number_value < 0 then
      window:perform_action(wezterm.action.ResetFontSize, pane)
      overrides.font_size = nil
      overrides.enable_tab_bar = true
    else
      overrides.font_size = number_value
      overrides.enable_tab_bar = false
    end
  end
  window:set_config_overrides(overrides)
end)

return config
