local cmp = require("cmp")

local kind_icons = {
  Array = "",
  Boolean = "",
  Class = "",
  Color = "",
  Constant = "",
  Constructor = "",
  Enum = "",
  EnumMember = "",
  Event = "",
  Field = "",
  File = "",
  Folder = "󰉋",
  Function = "",
  Interface = "",
  Key = "",
  Keyword = "",
  Method = "",
  Module = "",
  Namespace = "",
  Null = "󰟢",
  Number = "",
  Object = "",
  Operator = "",
  Package = "",
  Property = "",
  Reference = "",
  Snippet = "󱃖",
  String = "",
  Struct = "",
  Text = "",
  TypeParameter = "",
  Unit = "",
  Value = "",
  Variable = "",
  Copilot = "",
  Codeium = "󰘦",
}

cmp.setup({
  sources = {
    { name = "lazydev", group_index = 0 },
    { name = "nvim_lsp" },
    { name = "path" },
    { name = "buffer" },
    { name = "treesitter" },
    { name = "nvim_lsp_signature_help" },
  },
  confirm_opts = {
    behavior = cmp.ConfirmBehavior.Replace,
    select = false,
  },
  completion = {
    --   keyword_pattern = ".*",
    completeopt = "menu,menuone,noinsert",
  },
  formatting = {
    expandable_indicator = true,
    fields = { "kind", "abbr", "menu" },
    max_width = 0,
    duplicates_default = 0,
    format = function(entry, vim_item)
      vim_item.kind = kind_icons[vim_item.kind]

      local source_names = {
        nvim_lsp = "(LSP)",
        path = "(Path)",
        buffer = "(Buffer)",
        treesitter = "(TreeSitter)",
        nvim_lsp_signature_help = "(Signature Help)",
        lazydev = "(LazyDev)",
      }
      vim_item.menu = source_names[entry.source.name]

      return vim_item
    end,
  },
  window = {
    completion = cmp.config.window.bordered(),
    documentation = cmp.config.window.bordered(),
  },
  mapping = cmp.mapping.preset.insert({
    ["<Down>"] = cmp.mapping(cmp.mapping.select_next_item({ behavior = cmp.SelectBehavior.Select }), { "i" }),
    ["<Up>"] = cmp.mapping(cmp.mapping.select_prev_item({ behavior = cmp.SelectBehavior.Select }), { "i" }),
    ["<C-d>"] = cmp.mapping.scroll_docs(-4),
    ["<C-f>"] = cmp.mapping.scroll_docs(4),
    ["<Tab>"] = cmp.mapping(cmp.mapping.select_next_item({ behavior = cmp.SelectBehavior.Select }), { "i", "s" }),
    ["<S-Tab>"] = cmp.mapping(cmp.mapping.select_prev_item({ behavior = cmp.SelectBehavior.Select }), { "i", "s" }),
    ["<C-Space>"] = cmp.mapping.complete(),
    ["<C-e>"] = cmp.mapping.abort(),
    ["<Esc>"] = cmp.mapping.abort(),
    ["<CR>"] = cmp.mapping(
      cmp.mapping.confirm({
        behavior = cmp.ConfirmBehavior.Insert,
        select = true,
      }),
      { "i" }
    ),
  }),
})
