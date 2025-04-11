return {
  "CopilotC-Nvim/CopilotChat.nvim",
  dependencies = {
    { "zbirenbaum/copilot.lua" },
    { "nvim-lua/plenary.nvim" },
  },
  build = "make tiktoken",
  opts = {
    model = "claude-3.7-sonnet-thought",
  },
  event = "VeryLazy",
}
