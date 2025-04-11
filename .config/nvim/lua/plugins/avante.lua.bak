return {
  "yetone/avante.nvim",
  dependencies = {
    "nvim-treesitter/nvim-treesitter",
    "stevearc/dressing.nvim",
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
    "nvim-tree/nvim-web-devicons",
    "zbirenbaum/copilot.lua",
  },
  build = "make BUILD_FROM_SOURCE=true",
  config = function()
    require("avante").setup({
      provider = "copilot",
      -- openai = {
      --   model = " gpt-4o-2024-08-06",
      -- },
      behaviour = {
        auto_set_keymaps = false,
      },
      windows = {
        sidebar_header = {
          rounded = false,
        },
      },
    })
  end,
  event = "VeryLazy",
}
