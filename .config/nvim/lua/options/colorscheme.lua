local function get_theme_overrides(style)
  local palette = require("onedark.palette")[style]
  if type(palette) == "nil" then
    vim.notify(string.format("couldn't get palette for style %q", style), vim.log.levels.ERROR)
    return
  end
  local M = {}
  -- if style == "dark" then
  --   M.colors = {
  --     black = "#000000",
  --     bg0 = "#000000",
  --     bg1 = "#000000",
  --     bg2 = "#2c313a",
  --     bg3 = "#2c2f3a",
  --     bg_d = "#21252b",
  --     bg_blue = "#73b8f1",
  --     bg_yellow = "#ebd09c",
  --     fg = "#c7c7c7",
  --     purple = "#c678dd",
  --     green = "#98c379",
  --     orange = "#d19a66",
  --     blue = "#61afef",
  --     yellow = "#e5c07b",
  --     cyan = "#56b6c2",
  --     red = "#e06c75",
  --     grey = "#5c6370",
  --     light_grey = "#848b98",
  --     dark_cyan = "#2b6f77",
  --     diff_change = "#1c3448",
  --     diff_text = "#2c5372",
  --   }
  -- else
  --   M.colors = {
  --     black = "#000000",
  --     bg0 = "#ffffff",
  --     bg1 = "#ffffff",
  --     bg2 = "#eaeaea",
  --     bg3 = "#dcdcdc",
  --     bg_d = "#ffffff",
  --     bg_blue = "#68aee8",
  --     bg_yellow = "#e2c792",
  --     fg = "#383a42",
  --     purple = "#a626a4",
  --     green = "#50a14f",
  --     orange = "#c18401",
  --     blue = "#0184bc",
  --     yellow = "#c18401",
  --     cyan = "#0997b3",
  --     red = "#e45649",
  --     grey = "#a0a1a7",
  --     light_grey = "#818387",
  --     dark_cyan = "#2b5d63",
  --     dark_red = "#833b3b",
  --     dark_yellow = "#7c5c20",
  --     dark_purple = "#79428a",
  --     diff_add = "#e2fbe4",
  --     diff_delete = "#fce2e5",
  --     diff_change = "#e2ecfb",
  --     diff_text = "#cad3e0",
  --   }
  -- end
  M.highlights = {
    IblIndent = { fg = "$bg1", fmt = "nocombine" },
    IblWhitespace = { fmt = "nocombine" },
    IblScope = { fg = "$grey", fmt = "nocombine" },
    LspSignatureActiveParameter = { fg = "$fg", bg = "$bg2" },
    Winbar = { bg = "$bg0" },
    WinbarNC = { bg = "$bg0" },
    LspReferenceRead = { bg = "$bg3" },
    LspReferenceWrite = { bg = "$bg3" },
    CopilotSuggestion = { fg = "$grey" },
    WinSeparator = { fg = "$bg1", bg = "$bg1" },
  }
  return M
end

local function update_theme(mode)
  local onedark = require("onedark")

  local overrides = get_theme_overrides(mode)
  if type(overrides) == "nil" then
    return
  end
  onedark.set_options("style", mode)

  onedark.set_options("highlights", overrides.highlights)
  -- onedark.set_options("colors", overrides.colors)
  onedark.load()
end

local onedark = require("onedark")

onedark.setup({
  style = "light",
  toggle_style_list = { "dark", "light" },
})

local theme_switcher = require("theme-switcher")
theme_switcher.setup({
  onchange = update_theme,
})
