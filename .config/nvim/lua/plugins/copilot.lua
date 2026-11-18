return {
  "zbirenbaum/copilot.lua",
  dependencies = {
    "copilotlsp-nvim/copilot-lsp",
  },
  config = function()
    local copilot = require("copilot")
    copilot.setup({
      suggestion = {
        auto_trigger = true,
        hide_during_completion = false,
        keymap = {
          accept = "<S-CR>",
        },
      },
      -- nes = {
      --   enabled = false,
      --   auto_trigger = true,
      --   keymap = {
      --     accept_and_goto = "<S-CR>",
      --   },
      -- },
    })
  end,
  event = "VeryLazy",
}
