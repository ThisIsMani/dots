return {
  "nvim-lualine/lualine.nvim",
  config = function()
    require("options.lualine")
  end,
  event = "VeryLazy",
}
