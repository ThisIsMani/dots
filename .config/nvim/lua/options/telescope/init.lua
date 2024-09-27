local actions = require("telescope.actions")
local previewers = require("telescope.previewers")
local sorters = require("telescope.sorters")
local icons = require("options.icons")

local get_pickers = require("options.telescope.pickers")

require("telescope").setup({
  defaults = {
    prompt_prefix = icons.ui.Telescope .. " ",
    selection_caret = icons.ui.Forward .. " ",
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
    mappings = {
      i = {
        ["<C-j>"] = actions.preview_scrolling_down,
        ["<C-k>"] = actions.preview_scrolling_up,
        ["<C-q>"] = actions.smart_send_to_qflist + actions.open_qflist,
        ["<CR>"] = actions.select_default,
        ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
        ["<ScrollWheelUp>"] = actions.preview_scrolling_up,
        ["<ScrollWheelLeft>"] = actions.preview_scrolling_left,
        ["<ScrollWheelRight>"] = actions.preview_scrolling_right,
      },
      n = {
        ["<C-j>"] = actions.preview_scrolling_down,
        ["<C-k>"] = actions.preview_scrolling_up,
        ["<C-q>"] = actions.smart_send_to_qflist + actions.open_qflist,
        ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
        ["<ScrollWheelUp>"] = actions.preview_scrolling_up,
        ["<ScrollWheelLeft>"] = actions.preview_scrolling_left,
        ["<ScrollWheelRight>"] = actions.preview_scrolling_right,
      },
    },
    pickers = get_pickers(actions),
    set_env = { ["COLORTERM"] = "truecolor" },
  },
  pickers = get_pickers(actions),
  extensions = {
    resession = {
      prompt_title = "Find Sessions",
      dir = "session",
    },
    fzf = {
      fuzzy = true,
      override_generic_sorter = true,
      override_file_sorter = true,
      case_mode = "smart_case",
    },
  },
})

require("telescope").load_extension("fzf")
