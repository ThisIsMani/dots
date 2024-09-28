return {
  "neovim/nvim-lspconfig",
  dependencies = {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
    "j-hui/fidget.nvim",
    -- "ray-x/lsp_signature.nvim",
    "stevearc/conform.nvim",
    "folke/neodev.nvim",
    "SmiteshP/nvim-navic",
  },
  event = "BufReadPost",
  config = function()
    require("options.lsp")
  end,
}
