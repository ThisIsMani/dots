local M = {}

function M.setup()
  local mason_null_ls = require("mason-null-ls")

  local null_ls = require("null-ls")

  local default_opts = require("mani.lsp.handlers").get_common_opts()
  null_ls.setup(default_opts)

  mason_null_ls.setup({})
end

return M
