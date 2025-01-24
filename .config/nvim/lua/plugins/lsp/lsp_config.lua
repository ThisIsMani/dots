return {
  "neovim/nvim-lspconfig",
  dependencies = {
    "williamboman/mason-lspconfig.nvim",
  },
  event = "BufReadPost",
  config = function()
    require("options.lsp")
  end,
}
