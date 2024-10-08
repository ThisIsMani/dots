return {
  "hrsh7th/nvim-cmp",
  event = { "InsertEnter", "CmdlineEnter" },
  config = function()
    require("options.completion")
  end,
  dependencies = {
    "hrsh7th/cmp-nvim-lsp",
    "windwp/nvim-autopairs",
    -- "L3MON4D3/LuaSnip",
    "hrsh7th/cmp-buffer",
    "hrsh7th/cmp-path",
    "hrsh7th/cmp-cmdline",
    -- "saadparwaiz1/cmp_luasnip",
    -- "rafamadriz/friendly-snippets",
    "hrsh7th/cmp-nvim-lsp-signature-help",
    -- "zbirenbaum/copilot.lua"
  },
}
