local onedark = require("onedark")

local function get_theme_overrides(style)
  local palette = require("onedark.palette")[style]
  if type(palette) == "nil" then
    vim.notify(string.format("couldn't get palette for style %q", style), vim.log.levels.ERROR)
    return
  end
  local M = {}
  if style == "dark" then
    M.colors = {
      black = "#282c34",
      bg0 = "#282c34",
      bg1 = "#31353f",
      bg2 = "#393f4a",
      bg3 = "#3b3f4c",
      bg_d = "#21252b",
      bg_blue = "#73b8f1",
      bg_yellow = "#ebd09c",
      fg = "#dcdfe4",
      purple = "#c678dd",
      green = "#98c379",
      orange = "#d19a66",
      blue = "#61afef",
      yellow = "#e5c07b",
      cyan = "#56b6c2",
      red = "#e06c75",
      grey = "#5c6370",
      light_grey = "#848b98",
      dark_cyan = "#2b6f77",
      diff_change = "#1c3448",
      diff_text = "#2c5372",
    }
  else
    M.colors = {
      black = "#383a42",
      bg0 = "#fafafa",
      bg1 = "#f0f0f0",
      bg2 = "#e6e6e6",
      bg3 = "#dcdcdc",
      bg_d = "#ffffff",
      bg_blue = "#68aee8",
      bg_yellow = "#e2c792",
      fg = "#383a42",
      purple = "#a626a4",
      green = "#50a14f",
      orange = "#c18401",
      blue = "#0184bc",
      yellow = "#c18401",
      cyan = "#0997b3",
      red = "#e45649",
      grey = "#a0a1a7",
      light_grey = "#818387",
      dark_cyan = "#2b5d63",
      dark_red = "#833b3b",
      dark_yellow = "#7c5c20",
      dark_purple = "#79428a",
      diff_add = "#e2fbe4",
      diff_delete = "#fce2e5",
      diff_change = "#e2ecfb",
      diff_text = "#cad3e0",
    }
  end
  M.highlights = {
    IblIndent = { fg = "$bg1", fmt = "nocombine" },
    IblWhitespace = { fmt = "nocombine" },
    IblScope = { fg = "$grey", fmt = "nocombine" },
  }
  return M
end

local augroup_id = vim.api.nvim_create_augroup("OnedarkStyle", {})

vim.api.nvim_clear_autocmds({ group = augroup_id })
vim.api.nvim_create_autocmd("ColorSchemePre", {
  group = augroup_id,
  desc = "Apply theme overrides before colorscheme change",
  callback = function()
    local overrides = get_theme_overrides(vim.o.background)
    if type(overrides) == "nil" then
      return
    end
    onedark.set_options("highlights", overrides.highlights)
    onedark.set_options("colors", overrides.colors)
  end,
})

onedark.setup({
  style = "dark",
  toggle_style_list = { "dark", "light" },
  highlights = get_theme_overrides(vim.o.background).highlights,
  colors = get_theme_overrides(vim.o.background).colors,
})

onedark.load()
