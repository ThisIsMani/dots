local M = {}

function M.setup()
  local servers = require("mani.lsp.functions").get_servers()

  require("mason-lspconfig").setup({
    ensure_installed = servers,
    automatic_installation = true,
  })
end

return M
