return {
  tools = {
    on_initialized = function()
      vim.api.nvim_create_autocmd({ "BufWritePost", "BufEnter", "CursorHold", "InsertLeave" }, {
        pattern = { "*.rs" },
        callback = function()
          vim.lsp.codelens.refresh()
        end,
      })
    end,
    float_win_config = {
      border = 'rounded'
    }
  },
  server = {
    cmd = { 'ra-multiplex' },
    on_attach = function(client, bufnr)
      require("mani.lsp.handlers").common_on_attach(client, bufnr)
    end,
    settings = {
      ["rust-analyzer"] = {
        lens = {
          enable = true,
        },
        checkOnSave = true,
        procMacro = {
          enable = true,
          ignored = {
            ["async-trait"] = { "async_trait" },
            ["napi-derive"] = { "napi" },
            ["async-recursion"] = { "async_recursion" },
          },
        },
      },
    },
  },
}
