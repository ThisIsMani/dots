return {
  "numToStr/Comment.nvim",
  event = "InsertEnter",
  config = function()
    require("Comment").setup()
  end,
}
