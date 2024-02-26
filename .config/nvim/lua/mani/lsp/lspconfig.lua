local M = {}

function M.setup()
  local lspconfig = require("lspconfig")

  local opts = require("mani.lsp.handlers").get_common_opts()
  local servers = require("mani.lsp.functions").get_servers()

  for _, server in pairs(servers) do
    server = vim.split(server, "@")[1]

    if server == "lua_ls" then
      local new_opts = vim.tbl_deep_extend("force",
        {
          settings = {
            Lua = {
              diagnostics = {
                globals = { "vim", "filetype" }
              }
            },
            format = { enable = true }
          }
        },
        opts)
      lspconfig.lua_ls.setup(new_opts)
      goto continue
    end

    if server == "rust_analyzer" then
      goto continue
    end

    lspconfig[server].setup(opts)
    ::continue::
  end

  require('lspconfig.ui.windows').default_options.border = 'rounded'
end

return M
