local M = {}

local function setup_document_highlight(client, bufnr)
  local status_ok, highlight_supported = pcall(function()
    return client.supports_method("textDocument/documentHighlight")
  end)
  if not status_ok or not highlight_supported then
    return
  end

  local group = "lsp_document_highlight"
  local hl_events = { "CursorMoved" }

  local ok, hl_autocmds = pcall(vim.api.nvim_get_autocmds, {
    group = group,
    buffer = bufnr,
    event = hl_events,
  })

  if ok and #hl_autocmds > 0 then
    return
  end

  vim.api.nvim_create_augroup(group, { clear = false })
  vim.api.nvim_create_autocmd(hl_events, {
    group = group,
    buffer = bufnr,
    callback = function()
      vim.lsp.buf.clear_references()
      vim.lsp.buf.document_highlight()
    end,
  })
end

local function setup_codelens_refresh(client, bufnr)
  local status_ok, codelens_supported = pcall(function()
    return client.supports_method("textDocument/codeLens") and client.resolved_capabilities.codeLens
  end)
  if not status_ok or not codelens_supported then
    return
  end
  local group = "lsp_code_lens_refresh"
  local cl_events = { "BufEnter", "InsertLeave" }
  local ok, cl_autocmds = pcall(vim.api.nvim_get_autocmds, {
    group = group,
    buffer = bufnr,
    event = cl_events,
  })

  if ok and #cl_autocmds > 0 then
    return
  end
  vim.api.nvim_create_augroup(group, { clear = false })
  vim.api.nvim_create_autocmd(cl_events, {
    group = group,
    buffer = bufnr,
    callback = function()
      pcall(vim.lsp.codelens.refresh)
    end,
  })
end

function M.common_on_attach(client, bufnr)
  local opts = { buffer = bufnr, silent = true }
  local set = vim.keymap.set
  set("n", "gd", "<cmd>Telescope lsp_definitions<CR>", opts)
  set("n", "K", "<cmd>lua vim.lsp.buf.hover()<CR>", opts)
  set("n", "gI", "<cmd>Telescope lsp_implementations<CR>", opts)
  set("n", "gr", "<cmd>Telescope lsp_references<CR>", opts)
  set("n", "gl", "<cmd>lua vim.diagnostic.open_float()<CR>", opts)
  setup_document_highlight(client, bufnr)
  setup_codelens_refresh(client, bufnr)
  -- vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")
  -- vim.api.nvim_buf_set_option(bufnr, "formatexpr", "v:lua.vim.lsp.formatexpr(#{timeout_ms:500})")
  if client.server_capabilities.inlayHintProvider then
    vim.lsp.inlay_hint.enable(true)
  end

  -- local lsp_signature = require("lsp_signature")
  -- lsp_signature.on_attach(client, bufnr)

  if client.server_capabilities.documentSymbolProvider then
    local navic = require("nvim-navic")
    navic.attach(client, bufnr)
  end
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

return M
