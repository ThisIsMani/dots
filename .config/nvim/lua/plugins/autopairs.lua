return {
  "windwp/nvim-autopairs",
  config = function()
    require("nvim-autopairs").setup({
      check_ts = true,
      disable_in_macro = false,
    })
  end,
  event = "InsertEnter",
}
