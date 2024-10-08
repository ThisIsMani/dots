-- local cmp = require("cmp")
-- local luasnip = require("luasnip")

vim.opt.completeopt = { "menu", "menuone", "noinsert" }

-- require("luasnip.loaders.from_lua").lazy_load()
-- require("luasnip.loaders.from_vscode").lazy_load()
-- require("luasnip.loaders.from_snipmate").lazy_load()

-- local icons = require("options.icons")

require("options.completion.core_completion")

require("options.completion.cmdline_completion")

local npairs = require("nvim-autopairs")
npairs.setup({
  check_ts = true,
  disable_in_macro = false,
})

local cmp_autopairs = require("nvim-autopairs.completion.cmp")
local cmp = require("cmp")
cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
