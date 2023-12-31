local M = {}

function M.setup()
  local status_ok, telescope = pcall(require, "telescope")
  if not status_ok then
    return
  end

  local actions = require "telescope.actions"
  local previewers = require "telescope.previewers"
  local sorters = require "telescope.sorters"
  local icons = require "mani.icons"

  telescope.setup {
    defaults = {
      prompt_prefix = icons.ui.Telescope .. " ",
      selection_caret = icons.ui.Forward .. " ",
      entry_prefix = "  ",
      initial_mode = "insert",
      selection_strategy = "reset",
      sorting_strategy = "descending",
      layout_strategy = "horizontal",
      layout_config = {
        width = 0.75,
        preview_cutoff = 120,
        horizontal = {
          preview_width = function(_, cols, _)
            if cols < 120 then
              return math.floor(cols * 0.5)
            end
            return math.floor(cols * 0.6)
          end,
          mirror = false,
        },
        vertical = { mirror = false },
      },
      vimgrep_arguments = {
        "rg",
        "--color=never",
        "--no-heading",
        "--with-filename",
        "--line-number",
        "--column",
        "--smart-case",
        "--hidden",
        "--glob=!.git/",
      },
      ---@usage Mappings are fully customizable. Many familiar mapping patterns are setup as defaults.
      mappings = {
        i = {
          ["<C-j>"]             = actions.preview_scrolling_down,
          ["<C-k>"]             = actions.preview_scrolling_up,
          ["<C-c>"]             = actions.close,
          ["<C-n>"]             = actions.cycle_history_next,
          ["<C-p>"]             = actions.cycle_history_prev,
          ["<C-q>"]             = actions.smart_send_to_qflist + actions.open_qflist,
          ["<CR>"]              = actions.select_default,
          ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
          ["<ScrollWheelUp>"]   = actions.preview_scrolling_up,
        },
        n = {
          ["<C-j>"] = actions.preview_scrolling_down,
          ["<C-k>"] = actions.preview_scrolling_up,
          ["<C-n>"] = actions.move_selection_next,
          ["<C-p>"] = actions.move_selection_previous,
          ["<C-q>"] = actions.smart_send_to_qflist + actions.open_qflist,
          ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
          ["<ScrollWheelUp>"] = actions.preview_scrolling_up,
        },
      },
      pickers = require("mani.functions").get_pickers(actions),
      file_ignore_patterns = {},
      path_display = { "smart" },
      winblend = 0,
      border = {},
      borderchars = { "─", "│", "─", "│", "╭", "╮", "╯", "╰" },
      color_devicons = true,
      set_env = { ["COLORTERM"] = "truecolor" }, -- default = nil,
    },
    pickers = require("mani.functions").get_pickers(actions),
    extensions = {
      fzf = {
        fuzzy = true,                 -- false will only do exact matching
        override_generic_sorter = true, -- override the generic sorter
        override_file_sorter = true,  -- override the file sorter
        case_mode = "smart_case",     -- or "ignore_case" or "respect_case"
      },
    },
    file_previewer = previewers.vim_buffer_cat.new,
    grep_previewer = previewers.vim_buffer_vimgrep.new,
    qflist_previewer = previewers.vim_buffer_qflist.new,
    file_sorter = sorters.get_fuzzy_file,
    generic_sorter = sorters.get_generic_fuzzy_sorter,
  }
end

return M
