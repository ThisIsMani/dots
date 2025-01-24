return {
  "folke/lazydev.nvim",
  library = {
    -- See the configuration section for more details
    -- Load luvit types when the `vim.uv` word is found
    { path = "luvit-meta/library", words = { "vim%.uv" } },
  },
  ft = "lua",
}
