return {
  "hrsh7th/nvim-cmp",
  event = { "InsertEnter", "CmdlineEnter" },
  config = function()
    require("options.completion")
  end,
  dependencies = {
    "hrsh7th/cmp-nvim-lsp",
    "windwp/nvim-autopairs",
    "hrsh7th/cmp-buffer",
    "hrsh7th/cmp-path",
    "hrsh7th/cmp-cmdline",
    "hrsh7th/cmp-nvim-lsp-signature-help",
  },
}
