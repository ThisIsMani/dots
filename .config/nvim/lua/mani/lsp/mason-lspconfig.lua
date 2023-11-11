local M = {}

function M.setup()
  local servers = require("mani.lsp.functions").get_servers()
  local setup = {
    ensure_installed = servers,
    automatic_installation = true,
  }

  require("mason-lspconfig").setup(setup)
end

return M
