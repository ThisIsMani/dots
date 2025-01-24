return {
  "lewis6991/gitsigns.nvim",
  config = function()
    require("gitsigns").setup({
      attach_to_untracked = true,
    })
  end,
  event = "VeryLazy",
}
