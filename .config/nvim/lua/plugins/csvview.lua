return {
  "hat0uma/csvview.nvim",
  config = function()
    require("csvview").setup()
  end,
  event = "VeryLazy",
  ft = "csv",
}
