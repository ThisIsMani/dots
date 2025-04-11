return {
  "stevearc/conform.nvim",
  event = "LspAttach",
  config = function()
    require("conform").setup({
      formatters_by_ft = {
        lua = { "stylua" },
        json = { "fixjson" },
      },
      format_on_save = {
        lsp_format = "fallback",
        timeout_ms = 500,
      },
    })
  end,
}
