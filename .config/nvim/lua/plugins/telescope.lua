return {
  "nvim-telescope/telescope.nvim",
  config = function()
    require("options.telescope")
  end,
  dependencies = {
    "nvim-lua/plenary.nvim",
    "stevearc/dressing.nvim",
    "nvim-telescope/telescope-fzf-native.nvim",
    "nvim-telescope/telescope-symbols.nvim",
  },
  event = "VeryLazy",
  cmd = "Telescope",
}
