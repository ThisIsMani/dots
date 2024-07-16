local cmp = require("cmp")

cmp.setup.cmdline(":", {
  sources = {
    { name = "cmdline" },
  },
  window = {
    completion = cmp.config.window.bordered(),
  },
  completion = {
    ---@usage The minimum length of a word to complete on.
    keyword_length = 0,
    completeopt = "menu,menuone,noselect",
  },
  mapping = cmp.mapping.preset.cmdline({
    ["<C-d>"] = cmp.mapping.scroll_docs(-4),
    ["<C-f>"] = cmp.mapping.scroll_docs(4),
    ["<Tab>"] = cmp.mapping(cmp.mapping.select_next_item({ behavior = cmp.SelectBehavior.Insert }), { "c" }),
    ["<S-Tab>"] = cmp.mapping(cmp.mapping.select_prev_item({ behavior = cmp.SelectBehavior.Insert }), { "c" }),
    ["<C-Space>"] = cmp.mapping.complete(),
    ["<C-e>"] = cmp.mapping.abort(),
    ["<Esc>"] = cmp.mapping.abort(),
  }),
})

cmp.setup.cmdline({ "/", "?" }, {
  sources = {
    { name = "buffer" },
  },
  window = {
    completion = cmp.config.window.bordered(),
  },
  completion = {
    ---@usage The minimum length of a word to complete on.
    keyword_length = 0,
    completeopt = "menu,menuone,noselect",
  },
  mapping = cmp.mapping.preset.cmdline({
    ["<C-d>"] = cmp.mapping.scroll_docs(-4),
    ["<C-f>"] = cmp.mapping.scroll_docs(4),
    ["<Tab>"] = cmp.mapping(cmp.mapping.select_next_item({ behavior = cmp.SelectBehavior.Insert }), { "c" }),
    ["<S-Tab>"] = cmp.mapping(cmp.mapping.select_prev_item({ behavior = cmp.SelectBehavior.Insert }), { "c" }),
    ["<C-Space>"] = cmp.mapping.complete(),
    ["<C-e>"] = cmp.mapping.abort(),
    ["<Esc>"] = cmp.mapping.abort(),
  }),
})
