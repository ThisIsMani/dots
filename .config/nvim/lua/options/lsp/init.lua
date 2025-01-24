local lspconfig = require("lspconfig")
require("options.lsp.handlers")

local opts = require("options.lsp.utils").get_common_opts()

require("mason-lspconfig").setup_handlers({
  ["lua_ls"] = function()
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
  end,

  ["rust_analyzer"] = function() end,

  function(server_name)
    require("lspconfig")[server_name].setup(opts)
  end,
})

require("lspconfig.ui.windows").default_options.border = "rounded"

vim.lsp.log.set_level(vim.log.levels.OFF)
