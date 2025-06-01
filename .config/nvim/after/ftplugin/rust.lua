local bufnr = vim.api.nvim_get_current_buf()

local wo = require("options.utils").with_opts

vim.lsp.buf.hover = wo(vim.cmd.RustLsp, { "hover", "actions" })
