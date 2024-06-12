return {
  "neovim/nvim-lspconfig",
  dependencies = {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
    "j-hui/fidget.nvim",
    "ray-x/lsp_signature.nvim",
    "stevearc/conform.nvim",
    "folke/neodev.nvim",
  },
  event = { "BufReadPre", "BufNewFile" },
  config = function()
    require "options.lsp"
  end,
}
