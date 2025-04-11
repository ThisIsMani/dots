return {
  "nvim-telescope/telescope.nvim",
  config = function()
    require("options.telescope")
  end,
  dependencies = {
    "nvim-lua/plenary.nvim",
    "stevearc/dressing.nvim",
    { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    "nvim-telescope/telescope-ui-select.nvim",
    "nvim-telescope/telescope-symbols.nvim",
    "nvim-telescope/telescope-file-browser.nvim",
    "scottmckendry/telescope-resession.nvim",
  },
  event = "VeryLazy",
  cmd = "Telescope",
}
