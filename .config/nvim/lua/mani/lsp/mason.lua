local status_ok, mason = pcall(require, "mason")
if not status_ok then
  return
end

local status_ok_1, mason_lspconfig = pcall(require, "mason-lspconfig")
if not status_ok_1 then
  return
end

local servers = {
  "lua_ls",
  "rust_analyzer",
  "rescriptls",
  "clangd",
  "cssls",
}

local settings = {
  ui = {
    border = "rounded",
    keymaps = {
      toggle_package_expand = "<CR>",
      install_package = "i",
      update_package = "u",
      check_package_version = "c",
      update_all_packages = "U",
      check_outdated_packages = "C",
      uninstall_package = "X",
      cancel_installation = "<C-c>",
      apply_language_filter = "<C-f>",
    },
  },
}

mason.setup(settings)
mason_lspconfig.setup {
  ensure_installed = servers,
  automatic_installation = true,
}

require('lspconfig.ui.windows').default_options.border = 'rounded'

local lspconfig_status_ok, lspconfig = pcall(require, "lspconfig")
if not lspconfig_status_ok then
  return
end

local opts = require("mani.lsp.handlers").get_common_opts()

for _, server in pairs(servers) do
  server = vim.split(server, "@")[1]

  if server == "lua_ls" then
    local new_opts = vim.tbl_deep_extend("force",
      { settings = { Lua = { diagnostics = { globals = { "vim", "filetype" } } }, format = { enable = true } } },
      opts)
    lspconfig.lua_ls.setup(new_opts)
    goto continue
  end

  if server == "rust_analyzer" then
    local rust_opts = require "mani.lsp.settings.rust_analyzer"
    -- opts = vim.tbl_deep_extend("force", rust_opts, opts)
    local rust_tools_status_ok, rust_tools = pcall(require, "rust-tools")
    if not rust_tools_status_ok then
      return
    end

    rust_tools.setup(rust_opts)
    goto continue
  end

  lspconfig[server].setup(opts)
  ::continue::
end
