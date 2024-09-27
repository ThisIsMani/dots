return {
  "nvim-telescope/telescope.nvim",
  config = function()
    require("options.telescope")
  end,
  dependencies = {
    "nvim-lua/plenary.nvim",
    "stevearc/dressing.nvim",
    "nvim-telescope/telescope-fzf-native.nvim",
    "scottmckendry/telescope-resession.nvim",
    "stevearc/resession.nvim",
  },
}
