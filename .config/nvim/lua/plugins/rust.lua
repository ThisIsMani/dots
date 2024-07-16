return {
  "mrcjkb/rustaceanvim",
  ft = { "rust" },
  opts = {
    tools = {
      float_win_config = {
        border = "rounded",
      },
    },
    server = {
      cmd = { "ra-multiplex" },
      on_attach = function(client, bufnr)
        require("options.lsp.utils").common_on_attach(client, bufnr)
      end,
      settings = {
        ["rust-analyzer"] = {
          lens = {
            enable = true,
          },
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
  },
  config = function(_, opts)
    vim.g.rustaceanvim = vim.tbl_deep_extend("force", {}, opts or {})
  end,
}
