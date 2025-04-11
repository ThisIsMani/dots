local actions = require("telescope.actions")

local get_pickers = require("options.telescope.pickers")

local transform_mod = require("telescope.actions.mt").transform_mod

local custom_actions = transform_mod({
  smart_send_to_qflist = function(prompt_bufnr)
    actions.smart_send_to_qflist(prompt_bufnr)
    require("trouble").open({ mode = "qflist", focus = true })
  end,
})

require("telescope").setup({
  defaults = {
    prompt_prefix = " ",
    selection_caret = " ",
    layout_config = {
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
        ["<C-q>"] = custom_actions.smart_send_to_qflist,
        ["<CR>"] = actions.select_default,
        ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
        ["<ScrollWheelUp>"] = actions.preview_scrolling_up,
        ["<ScrollWheelLeft>"] = actions.preview_scrolling_left,
        ["<ScrollWheelRight>"] = actions.preview_scrolling_right,
      },
      n = {
        ["<C-j>"] = actions.preview_scrolling_down,
        ["<C-k>"] = actions.preview_scrolling_up,
        ["<C-q>"] = custom_actions.smart_send_to_qflist,
        ["<ScrollWheelDown>"] = actions.preview_scrolling_down,
        ["<ScrollWheelUp>"] = actions.preview_scrolling_up,
        ["<ScrollWheelLeft>"] = actions.preview_scrolling_left,
        ["<ScrollWheelRight>"] = actions.preview_scrolling_right,
      },
    },
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
    ["ui-select"] = {
      require("telescope.themes").get_dropdown({}),
    },
    file_browser = {},
  },
})

require("telescope").load_extension("fzf")
require("telescope").load_extension("ui-select")
require("telescope").load_extension("file_browser")
