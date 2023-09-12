return {
  tools = {
    -- autoSetHints = false,
    on_initialized = function()
      vim.api.nvim_create_autocmd({ "BufWritePost", "BufEnter", "CursorHold", "InsertLeave" }, {
        pattern = { "*.rs" },
        callback = function()
          vim.lsp.codelens.refresh()
        end,
      })
    end,
    auto = false,
    inlay_hints = {
      auto = true,
      only_current_line = false,
      show_parameter_hints = true,
      parameter_hints_prefix = "<-",
      other_hints_prefix = "=>",
      max_len_align = false,
      max_len_align_padding = 1,
      right_align = false,
      right_align_padding = 7,
      highlight = "Comment",
    },
    hover_actions = {
      border = "rounded",
    },
  },
  server = {
    cmd = { "ra-multiplex" },
    capabilities = require("mani.lsp.handlers").common_capabilities(),
    on_attach = function(client, bufnr)
      require("mani.lsp.handlers").common_on_attach(client, bufnr)
      local rt = require "rust-tools"
      vim.keymap.set("n", "K", rt.hover_actions.hover_actions, { buffer = bufnr })
    end,
    settings = {
      ["rust-analyzer"] = {
        lens = {
          enable = true,
        },
        checkOnSave = {
          command = "check",
          extraArgs = { "--target-dir", "Users/mani.dchandra/.cache/shared_rust_target/analyzer" }
        },
      },
    },
  },
}
