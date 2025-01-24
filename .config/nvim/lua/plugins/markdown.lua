return {
  "MeanderingProgrammer/markdown.nvim",
  dependencies = { "nvim-treesitter/nvim-treesitter", "nvim-tree/nvim-web-devicons" },
  opts = {
    file_types = { "markdown", "Avante", "codecompanion" },
  },
  -- config = function()
  --   require("render-markdown").setup({})
  -- end,
  ft = { "markdown", "Avante", "codecompanion" },
}
