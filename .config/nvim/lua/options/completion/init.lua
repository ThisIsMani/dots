vim.opt.completeopt = { "menu", "menuone", "noinsert" }

require("options.completion.core_completion")

require("options.completion.cmdline_completion")

local cmp_autopairs = require("nvim-autopairs.completion.cmp")
local cmp = require("cmp")
cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
