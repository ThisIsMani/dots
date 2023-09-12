local status_ok, _ = pcall(require, "lspconfig")
if not status_ok then
  return
end

require("mani.lsp.handlers").setup()
require("mani.lsp.mason")
require("mani.lsp.null-ls")

require("fidget").setup {}
require("lsp_lines").setup {}
require("lsp-lens").setup {}

local setup = {
  ensure_installed = {},
  automatic_installation = {
    exclude = { "rust-analyzer" },
  },
}

pcall(function()
  require("mason-lspconfig").setup(setup)
  local util = require "lspconfig.util"
  util.on_setup = nil
end)
