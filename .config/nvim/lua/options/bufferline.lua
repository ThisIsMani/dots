-- local status_ok, bufferline = pcall(require, "bufferline")
-- if not status_ok then
--   return
-- end
--
local bufferline = require("bufferline")
local icons = require("options.icons")

local function is_ft(b, ft)
  return vim.bo[b].filetype == ft
end

local function diagnostics_indicator(_, _, diagnostics, _)
  local result = {}
  local symbols = {
    error = icons.diagnostics.Error,
    warning = icons.diagnostics.Warning,
    info = icons.diagnostics.Information,
  }
  for name, count in pairs(diagnostics) do
    if symbols[name] and count > 0 then
      table.insert(result, symbols[name] .. " " .. count)
    end
  end
  local res = table.concat(result, " ")
  return #res > 0 and res or ""
end

local function custom_filter(buf, buf_nums)
  local logs = vim.tbl_filter(function(b)
    return is_ft(b, "log")
  end, buf_nums)
  if vim.tbl_isempty(logs) then
    return true
  end
  local tab_num = vim.fn.tabpagenr()
  local last_tab = vim.fn.tabpagenr("$")
  local is_log = is_ft(buf, "log")
  if last_tab == 1 then
    return true
  end
  return (tab_num == last_tab and is_log) or (tab_num ~= last_tab and not is_log)
end

bufferline.setup({
  options = {
    mode = "buffers", -- set to "tabs" to only show tabpages instead
    numbers = "none",
    close_command = function(bufnr) -- can be a string | function, see "Mouse actions"
      require("options.utils").buf_kill("<leader>c", bufnr, false)
    end,
    indicator = {
      icon = icons.ui.BoldLineLeft, -- this should be omitted if indicator style is not 'icon'
      style = "icon", -- can also be 'underline'|'none',
    },
    buffer_close_icon = icons.ui.Close,
    modified_icon = icons.ui.Circle,
    close_icon = icons.ui.BoldClose,
    left_trunc_marker = icons.ui.ArrowCircleLeft,
    right_trunc_marker = icons.ui.ArrowCircleRight,
    name_formatter = function(buf)
      if buf.name:match("%.md") then
        return vim.fn.fnamemodify(buf.name, ":t:r")
      end
    end,
    diagnostics = "nvim_lsp",
    diagnostics_indicator = diagnostics_indicator,
    custom_filter = custom_filter,
    offsets = {
      {
        filetype = "NvimTree",
        text = "Explorer",
        highlight = "PanelHeading",
        padding = 1,
      },
    },
    color_icons = true,
    show_buffer_icons = true,
    show_buffer_close_icons = true,
    show_close_icon = false,
    show_tab_indicators = true,
    persist_buffer_sort = true,
    separator_style = "thin",
    enforce_regular_tabs = false,
    always_show_bufferline = false,
    sort_by = "id",
  },
  highlights = {
    background = {
      italic = true,
    },
    buffer_selected = {
      bold = true,
    },
  },
})
