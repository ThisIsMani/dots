-- return {
--   "norcalli/nvim-colorizer.lua",
--   config = function()
--     require("colorizer").setup()
--   end,
--   event = "VeryLazy",
-- }

return {
  "brenoprata10/nvim-highlight-colors",
  config = function()
    require("nvim-highlight-colors").setup({})
  end,
  event = "VeryLazy",
}
