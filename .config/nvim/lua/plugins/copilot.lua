return {
  "zbirenbaum/copilot.lua",
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
    })
  end,
  event = "VeryLazy",
}
