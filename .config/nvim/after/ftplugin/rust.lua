-- local bufnr = vim.api.nvim_get_current_buf()

local utils = require("options.utils")
local wo = utils.with_opts

vim.lsp.buf.hover = wo(vim.cmd.RustLsp, { "hover", "actions" })
vim.diagnostic.open_float = wo(vim.cmd.RustLsp, { "renderDiagnostic", "current" })

utils.set_keymap("n", "J", wo(vim.cmd.RustLsp, "joinLines"))
utils.set_keymap("n", "gL", wo(vim.cmd.RustLsp, "relatedDiagnostics"))
