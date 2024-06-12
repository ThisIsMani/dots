local M = {}

function M.setup()
  local status_ok, bufferline = pcall(require, "bufferline")
  if not status_ok then
    return
  end

  local icons = require "mani.icons"

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
    result = table.concat(result, " ")
    return #result > 0 and result or ""
  end

  local function custom_filter(buf, buf_nums)
    local logs = vim.tbl_filter(function(b)
      return is_ft(b, "log")
    end, buf_nums)
    if vim.tbl_isempty(logs) then
      return true
    end
    local tab_num = vim.fn.tabpagenr()
    local last_tab = vim.fn.tabpagenr "$"
    local is_log = is_ft(buf, "log")
    if last_tab == 1 then
      return true
    end
    -- only show log buffers in secondary tabs
    return (tab_num == last_tab and is_log) or (tab_num ~= last_tab and not is_log)
  end

  bufferline.setup {
    options = {
      mode = "buffers",             -- set to "tabs" to only show tabpages instead
      numbers = "none",             -- can be "none" | "ordinal" | "buffer_id" | "both" | function
      close_command = function(bufnr) -- can be a string | function, see "Mouse actions"
        require('mani.functions').buf_kill("bd", bufnr, false)
      end,
      right_mouse_command = "vert sbuffer %d", -- can be a string | function, see "Mouse actions"
      left_mouse_command = "buffer %d",      -- can be a string | function, see "Mouse actions"
      middle_mouse_command = nil,            -- can be a string | function, see "Mouse actions"
      indicator = {
        icon = icons.ui.BoldLineLeft,        -- this should be omitted if indicator style is not 'icon'
        style = "icon",                      -- can also be 'underline'|'none',
      },
      buffer_close_icon = icons.ui.Close,
      modified_icon = icons.ui.Circle,
      close_icon = icons.ui.BoldClose,
      left_trunc_marker = icons.ui.ArrowCircleLeft,
      right_trunc_marker = icons.ui.ArrowCircleRight,
      name_formatter = function(buf) -- buf contains a "name", "path" and "bufnr"
        if buf.name:match "%.md" then
          return vim.fn.fnamemodify(buf.name, ":t:r")
        end
      end,
      max_name_length = 18,
      max_prefix_length = 15, -- prefix used when a buffer is de-duplicated
      truncate_names = true, -- whether or not tab names should be truncated
      tab_size = 18,
      diagnostics = "nvim_lsp",
      diagnostics_update_in_insert = false,
      diagnostics_indicator = diagnostics_indicator,
      -- NOTE: this will be called a lot so don't do any heavy processing here
      custom_filter = custom_filter,
      offsets = {
        {
          filetype = "undotree",
          text = "Undotree",
          highlight = "PanelHeading",
          padding = 1,
        },
        {
          filetype = "NvimTree",
          text = "Explorer",
          highlight = "PanelHeading",
          padding = 1,
        },
        {
          filetype = "DiffviewFiles",
          text = "Diff View",
          highlight = "PanelHeading",
          padding = 1,
        },
        {
          filetype = "flutterToolsOutline",
          text = "Flutter Outline",
          highlight = "PanelHeading",
        },
        {
          filetype = "packer",
          text = "Packer",
          highlight = "PanelHeading",
          padding = 1,
        },
      },
      color_icons = true,     -- whether or not to add the filetype icon highlights
      show_buffer_icons = true, -- disable filetype icons for buffers
      show_buffer_close_icons = true,
      show_close_icon = false,
      show_tab_indicators = true,
      persist_buffer_sort = true, -- whether or not custom sorted buffers should persist
      -- can also be a table containing 2 custom separators
      -- [focused and unfocused]. eg: { '|', '|' }
      separator_style = "thin",
      enforce_regular_tabs = false,
      always_show_bufferline = false,
      hover = {
        enabled = false, -- requires nvim 0.8+
        delay = 200,
        reveal = { "close" },
      },
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
  }
end

return M
