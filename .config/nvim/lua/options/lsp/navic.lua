local navic = require("nvim-navic")

local icons = require("options.icons")
local M = {}

local winbar_filetype_exclude = {
  "help",
  "startify",
  "dashboard",
  "packer",
  "neo-tree",
  "neogitstatus",
  "NvimTree",
  "Trouble",
  "alpha",
  "lir",
  "Outline",
  "spectre_panel",
  "toggleterm",
  "DressingSelect",
  "Jaq",
  "harpoon",
  "dap-repl",
  "dap-terminal",
  "dapui_console",
  "lab",
  "Markdown",
  "notify",
  "noice",
  "",
}

local get_filename = function()
  local filename = vim.fn.expand("%:t")
  local extension = vim.fn.expand("%:e")
  local utils = require("options.utils")

  if not utils.isempty(filename) then
    local file_icon, file_icon_color =
      require("nvim-web-devicons").get_icon_color(filename, extension, { default = true })

    local hl_group = "FileIconColor" .. extension
    vim.api.nvim_set_hl(0, hl_group, { fg = file_icon_color })

    if utils.isempty(file_icon) then
      file_icon = icons.kind.File
    end

    local buf_ft = vim.bo.filetype

    if buf_ft == "dapui_breakpoints" then
      file_icon = icons.ui.Bug
    end

    if buf_ft == "dapui_stacks" then
      file_icon = icons.ui.Stacks
    end

    if buf_ft == "dapui_scopes" then
      file_icon = icons.ui.Scopes
    end

    if buf_ft == "dapui_watches" then
      file_icon = icons.ui.Watches
    end

    return " " .. "%#" .. hl_group .. "#" .. file_icon .. "%*" .. " " .. "%#Winbar#" .. filename .. "%*"
  end
end

local get_gps = function()
  local status_gps_ok, gps = pcall(require, "nvim-navic")
  if not status_gps_ok then
    return ""
  end

  local status_ok, gps_location = pcall(gps.get_location, {})
  if not status_ok then
    return ""
  end

  if not gps.is_available() or gps_location == "error" then
    return ""
  end

  if not require("options.utils").isempty(gps_location) then
    return "%#NavicSeparator#" .. icons.ui.ChevronRight .. "%* " .. gps_location
  else
    return ""
  end
end

local excludes = function()
  return vim.tbl_contains(winbar_filetype_exclude or {}, vim.bo.filetype)
end

M.get_winbar = function()
  if excludes() then
    return
  end
  local utils = require("options.utils")
  local value = get_filename()

  local gps_added = false
  if not utils.isempty(value) then
    local gps_value = get_gps()
    value = value .. " " .. gps_value
    if not utils.isempty(gps_value) then
      gps_added = true
    end
  end

  if not utils.isempty(value) and utils.get_buf_option("mod") then
    local mod = "%#LspCodeLens#" .. icons.ui.Circle .. "%*"
    if gps_added then
      value = value .. " " .. mod
    else
      value = value .. mod
    end
  end

  local num_tabs = #vim.api.nvim_list_tabpages()

  if num_tabs > 1 and not utils.isempty(value) then
    local tabpage_number = tostring(vim.api.nvim_tabpage_get_number(0))
    value = value .. "%=" .. tabpage_number .. "/" .. tostring(num_tabs)
  end

  vim.api.nvim_set_option_value("winbar", value, { scope = "local" })
end

M.new = function()
  local status_ok, _ = pcall(vim.api.nvim_buf_get_var, 0, "lsp_floating_window")
  if not status_ok then
    M.get_winbar()
  end
end

vim.api.nvim_create_augroup("_winbar", {})

navic.setup({
  options = {
    icons = {
      Array = icons.kind.Array .. " ",
      Boolean = icons.kind.Boolean,
      Class = icons.kind.Class .. " ",
      Color = icons.kind.Color .. " ",
      Constant = icons.kind.Constant .. " ",
      Constructor = icons.kind.Constructor .. " ",
      Enum = icons.kind.Enum .. " ",
      EnumMember = icons.kind.EnumMember .. " ",
      Event = icons.kind.Event .. " ",
      Field = icons.kind.Field .. " ",
      File = icons.kind.File .. " ",
      Folder = icons.kind.Folder .. " ",
      Function = icons.kind.Function .. " ",
      Interface = icons.kind.Interface .. " ",
      Key = icons.kind.Key .. " ",
      Keyword = icons.kind.Keyword .. " ",
      Method = icons.kind.Method .. " ",
      Module = icons.kind.Module .. " ",
      Namespace = icons.kind.Namespace .. " ",
      Null = icons.kind.Null .. " ",
      Number = icons.kind.Number .. " ",
      Object = icons.kind.Object .. " ",
      Operator = icons.kind.Operator .. " ",
      Package = icons.kind.Package .. " ",
      Property = icons.kind.Property .. " ",
      Reference = icons.kind.Reference .. " ",
      Snippet = icons.kind.Snippet .. " ",
      String = icons.kind.String .. " ",
      Struct = icons.kind.Struct .. " ",
      Text = icons.kind.Text .. " ",
      TypeParameter = icons.kind.TypeParameter .. " ",
      Unit = icons.kind.Unit .. " ",
      Value = icons.kind.Value .. " ",
      Variable = icons.kind.Variable .. " ",
    },
    -- highlight = true,
    separator = " " .. icons.ui.ChevronRight .. " ",
    -- depth_limit = 0,
    -- depth_limit_indicator = "..",
  },
})

vim.api.nvim_create_autocmd(
  { "CursorMoved", "BufWinEnter", "BufFilePost", "InsertEnter", "BufWritePost", "TabClosed" },
  {
    group = "_winbar",
    callback = function()
      local status_ok, _ = pcall(vim.api.nvim_buf_get_var, 0, "lsp_floating_window")
      if not status_ok then
        M.get_winbar()
      end
    end,
  }
)

return M
