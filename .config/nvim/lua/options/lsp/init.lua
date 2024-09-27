local lspconfig = require("lspconfig")
require("options.lsp.mason")
require("options.lsp.format")
require("neodev").setup()
require("fidget").setup({})
require("options.lsp.handlers")

local opts = require("options.lsp.utils").get_common_opts()
local servers = require("mason-lspconfig").get_installed_servers()

for _, server in pairs(servers) do
  server = vim.split(server, "@")[1]

  if server == "lua_ls" then
    local new_opts = vim.tbl_deep_extend("force", {
      settings = {
        server_capabilities = {
          semanticTokensProvider = vim.NIL,
        },
        Lua = {
          diagnostics = {
            globals = { "vim", "filetype" },
          },
        },
      },
    }, opts)
    lspconfig.lua_ls.setup(new_opts)
    goto continue
  end

  if server == "rust_analyzer" then
    goto continue
  end

  lspconfig[server].setup(opts)
  ::continue::
end

require("lspconfig.ui.windows").default_options.border = "rounded"

require("options.lsp.navic")

vim.lsp.log.set_level(vim.log.levels.OFF)
