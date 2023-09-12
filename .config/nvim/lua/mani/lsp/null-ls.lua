local mason_status_ok, mason_null_ls = pcall(require, "mason-null-ls")
if not mason_status_ok then
	return
end

local status_ok, null_ls = pcall(require, "null-ls")
if not status_ok then
	return
end

local default_opts = require("mani.lsp.handlers").get_common_opts()
null_ls.setup(default_opts)

mason_null_ls.setup({})
