local lualine = require("lualine")

local components = {
  mode = {
    "mode",
    fmt = function(str)
      return " " .. str
    end,
  },
  branch = {
    "b:gitsigns_head",
    icon = "",
    color = { gui = "bold" },
  },
  diff = {
    "diff",
    symbols = {
      added = " ",
      modified = " ",
      removed = " ",
    },
  },
}

lualine.setup({
  options = {
    theme = "auto",
    globalstatus = true,
    icons_enabled = true,
    component_separators = { left = "|", right = "|" },
    section_separators = { left = "", right = "" },
    disabled_filetypes = { "alpha" },
  },
  sections = {
    lualine_a = {
      components.mode,
    },
    lualine_b = {
      components.branch,
    },
    lualine_c = {
      components.diff,
    },
    lualine_x = {
      "diagnostics",
      "lsp",
      "filetype",
    },
    lualine_y = { "location" },
    lualine_z = {
      "progress",
    },
  },
  inactive_sections = {
    lualine_a = {},
    lualine_b = {},
    lualine_c = { "filename" },
    lualine_x = { "location" },
    lualine_y = {},
    lualine_z = {},
  },
  tabline = {},
  extensions = {},
})
