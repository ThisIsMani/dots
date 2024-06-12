local icons = require "options.icons"

local float = {
  focusable = true,
  style = "minimal",
  border = "rounded",
}

local config = {
  virtual_text = true,
  virtual_lines = false,
  signs = {
    active = true,
    values = {
      { name = "DiagnosticSignError", text = icons.diagnostics.Error },
      { name = "DiagnosticSignWarn", text = icons.diagnostics.Warning },
      { name = "DiagnosticSignHint", text = icons.diagnostics.Hint },
      { name = "DiagnosticSignInfo", text = icons.diagnostics.Info },
    },
  },
  update_in_insert = true,
  underline = true,
  severity_sort = true,
  float = {
    focusable = false,
    style = "minimal",
    border = "rounded",
    source = "always",
    header = "",
    prefix = "",
    format = function(d)
      local code = d.code or (d.user_data and d.user_data.lsp.code)
      if code then
        return string.format("%s [%s]", d.message, code):gsub("1. ", "")
      end
      return d.message
    end,
  },
}

for _, sign in ipairs(config.signs.values) do
  vim.fn.sign_define(sign.name, { texthl = sign.name, text = sign.text, numhl = "" })
end

vim.diagnostic.config(config)
vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(vim.lsp.handlers.hover, float)
vim.lsp.handlers["textDocument/signatureHelp"] = vim.lsp.with(vim.lsp.handlers.signature_help, float)
