return {
  "sindrets/diffview.nvim",
  config = function()
    local actions = require("diffview.actions")

    require("diffview").setup({
      enhanced_diff_hl = true,
      keymaps = {
        view = {
          ["<leader>b"] = false,
          { "n", "<leader>e", actions.focus_files },
          { "n", "<leader>gd", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
          { "n", "<leader>fd", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
          { "n", "<leader>z", actions.toggle_files },
          { "n", "<leader>wq", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
        },
        file_panel = {
          { "n", "<leader>gd", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
          { "n", "<leader>fd", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
          { "n", "<cr>", actions.focus_entry, { desc = "Open and focus the diff for the selected entry." } },
          { "n", "o", actions.focus_entry, { desc = "Open and focus the diff for the selected entry." } },
          { "n", "<leader>b", false },
          { "n", "<leader>z", actions.toggle_files },
          { "n", "<leader>wq", "<cmd>DiffviewClose<CR>", { desc = "Close diffview" } },
        },
      },
    })
  end,
  dependencies = {
    "tpope/vim-fugitive",
  },
  event = "VeryLazy",
  cmd = "DiffviewOpen",
}
