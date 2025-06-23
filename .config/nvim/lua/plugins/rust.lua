return {
  "mrcjkb/rustaceanvim",
  dependencies = {
    "windwp/nvim-autopairs",
  },
  ft = { "rust" },
  opts = {
    tools = {
      float_win_config = {
        border = "rounded",
      },
    },
    server = {
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
              -- ["async-trait"] = { "async_trait" },
              ["napi-derive"] = { "napi" },
              ["async-recursion"] = { "async_recursion" },
            },
          },
          check = {
            enable = true,
            command = "clippy",
            features = "all",
          },
        },
      },
    },
  },
  config = function(_, opts)
    vim.g.rustaceanvim = vim.tbl_deep_extend("force", {}, opts or {})

    local npairs = require("nvim-autopairs")
    local basic = require("nvim-autopairs.rules.basic")
    local opt = npairs.config
    local bracket = basic.bracket_creator(opt)
    npairs.add_rules({
      bracket("<", ">"),
    })
  end,
}
