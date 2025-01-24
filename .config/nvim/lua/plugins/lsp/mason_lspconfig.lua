return {
  "williamboman/mason-lspconfig.nvim",
  opts = {
    ensure_installed = { "lua_ls" },
  },
  dependencies = {
    "williamboman/mason.nvim",
  },
  lazy = true,
}
