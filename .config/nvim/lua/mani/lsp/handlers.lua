local M = {}

local icons = require("mani.icons")

local float = {
  focusable = true,
  style = "minimal",
  border = "rounded",
}

function M.common_on_attach(client, bufnr)
  local opts = { noremap = true, silent = true }
  local keymap = vim.api.nvim_buf_set_keymap
  keymap(bufnr, "n", "gD", "<cmd>Telescope lsp_type_definitions<CR>", opts)
  keymap(bufnr, "n", "gd", "<cmd>Telescope lsp_definitions<CR>", opts)
  keymap(bufnr, "n", "K", "<cmd>lua vim.lsp.buf.hover()<CR>", opts)
  keymap(bufnr, "n", "gI", "<cmd>Telescope lsp_implementations<CR>", opts)
  keymap(bufnr, "n", "gr", "<cmd>Telescope lsp_references<CR>", opts)
  keymap(bufnr, "n", "gl", "<cmd>lua vim.diagnostic.open_float()<CR>", opts)
  local lu = require "mani.lsp.functions"
  lu.setup_document_highlight(client, bufnr)
  lu.setup_codelens_refresh(client, bufnr)
  vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
  vim.api.nvim_buf_set_option(bufnr, "formatexpr", "v:lua.vim.lsp.formatexpr(#{timeout_ms:500})")
  if client.server_capabilities.inlayHintProvider then
    vim.lsp.inlay_hint.enable(true)
  end

  local lsp_signature = require("lsp_signature")
  lsp_signature.on_attach(client, bufnr)

  local navic = require("nvim-navic")
  navic.attach(client, bufnr)
end

function M.common_capabilities()
  local status_ok, cmp_nvim_lsp = pcall(require, "cmp_nvim_lsp")
  if status_ok then
    return cmp_nvim_lsp.default_capabilities()
  end
  local capabilities = vim.lsp.protocol.make_client_capabilities()
  capabilities.textDocument.completion.completionItem.snippetSupport = true
  capabilities.textDocument.completion.completionItem.resolveSupport = {
    properties = {
      "documentation",
      "detail",
      "additionalTextEdits",
    },
  }
  return capabilities
end

function M.get_common_opts()
  return {
    on_attach = M.common_on_attach,
    capabilities = M.common_capabilities(),
  }
end

function M.setup()
  local config = {
    virtual_text = true,
    virtual_lines = false,
    signs = {
      active = true,
      values = {
        { name = "DiagnosticSignError", text = icons.diagnostics.Error },
        { name = "DiagnosticSignWarn",  text = icons.diagnostics.Warning },
        { name = "DiagnosticSignHint",  text = icons.diagnostics.Hint },
        { name = "DiagnosticSignInfo",  text = icons.diagnostics.Info },
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
end

return M
