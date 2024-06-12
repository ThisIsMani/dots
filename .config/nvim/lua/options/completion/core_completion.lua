local cmp = require("cmp")
require("luasnip").setup({})

require("luasnip.loaders.from_lua").lazy_load()
require("luasnip.loaders.from_vscode").lazy_load()
require("luasnip.loaders.from_snipmate").lazy_load()

local luasnip = require("luasnip")
local icons = require("options.icons")

cmp.setup({
  sources = {
    { name = "nvim_lsp" },
    { name = "path" },
    { name = "luasnip" },
    { name = "buffer" },
    { name = "treesitter" },
    -- { name = "crates" },
  },
  confirm_opts = {
    behavior = cmp.ConfirmBehavior.Replace,
    select = false,
  },
  snippet = {
    expand = function(args)
      require("luasnip").lsp_expand(args.body)
    end,
  },
  completion = {
    keyword_length = 0,
    completeopt = "menu,menuone,noinsert",
  },
  formatting = {
    expandable_indicator = true,
    fields = { "kind", "abbr", "menu" },
    max_width = 0,
    duplicates_default = 0,
    format = function(entry, vim_item)
      vim_item.kind = icons.kind[vim_item.kind]

      if entry.source.name == "crates" then
        vim_item.kind = icons.misc.Package
        vim_item.kind_hl_group = "CmpItemKindCrate"
      end

      if entry.source.name == "lab.quick_data" then
        vim_item.kind = icons.misc.CircuitBoard
        vim_item.kind_hl_group = "CmpItemKindConstant"
      end

      if entry.source.name == "emoji" then
        vim_item.kind = icons.misc.Smiley
        vim_item.kind_hl_group = "CmpItemKindEmoji"
      end

      local source_names = {
        copilot = "(Copilot)",
        nvim_lsp = "(LSP)",
        path = "(Path)",
        vsnip = "(Snippet)",
        luasnip = "(Snippet)",
        buffer = "(Buffer)",
        tmux = "(TMUX)",
        treesitter = "(TreeSitter)",
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
    ["<Tab>"] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_next_item({ behavior = cmp.SelectBehavior.Select })
      elseif luasnip.locally_jumpable(1) then
        luasnip.jump(1)
      else
        fallback()
      end
    end, { "i", "s" }),
    ["<S-Tab>"] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_prev_item({ behavior = cmp.SelectBehavior.Select })
      elseif luasnip.locally_jumpable(-1) then
        luasnip.jump(-1)
      else
        fallback()
      end
    end, { "i", "s" }),
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
