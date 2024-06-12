local M = {}

function M.setup()
  local status_ok, configs = pcall(require, "nvim-treesitter.configs")
  if not status_ok then
    return
  end


  local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
  parser_config.rescript = {
    install_info = {
      url = "https://github.com/rescript-lang/tree-sitter-rescript",
      branch = "main",
      files = { "src/parser.c", "src/scanner.c" },
      generate_requires_npm = false,
      requires_generate_from_grammar = true,
      use_makefile = true, -- macOS specific instruction
    },
  }

  configs.setup {
    ensure_installed = { "rust", "java", "python" },
    ignore_install = {},
    parser_install_dir = nil,
    sync_install = false,
    auto_install = false,
    matchup = {
      enable = false, -- mandatory, false will disable the whole extension
    },
    highlight = {
      enable = true, -- false will disable the whole extension
      additional_vim_regex_highlighting = false,
      disable = { "markdown" },
    },
    indent = { enable = true, disable = { "yaml", "python" } },
    context_commentstring = {
      enable = true,
      enable_autocmd = false,
      config = {
        -- Languages that have a single comment style
        typescript = "// %s",
        css = "/* %s */",
        scss = "/* %s */",
        html = "<!-- %s -->",
        svelte = "<!-- %s -->",
        vue = "<!-- %s -->",
        json = "",
      },
    },
    autotag = { enable = false },
    autopairs = {
      enable = true,
    },
    textobjects = {
      swap = {
        enable = false,
        -- swap_next = textobj_swap_keymaps,
      },
      select = {
        enable = true,
        -- Automatically jump forward to textobj, similar to targets.vim
        lookahead = true,
        keymaps = {
          -- You can use the capture groups defined in textobjects.scm
          ["af"] = "@function.outer",
          ["if"] = "@function.inner",
          ["at"] = "@class.outer",
          ["it"] = "@class.inner",
          ["ac"] = "@call.outer",
          ["ic"] = "@call.inner",
          ["aa"] = "@parameter.outer",
          ["ia"] = "@parameter.inner",
          ["al"] = "@loop.outer",
          ["il"] = "@loop.inner",
          ["ai"] = "@conditional.outer",
          ["ii"] = "@conditional.inner",
          ["a/"] = "@comment.outer",
          ["i/"] = "@comment.inner",
          ["ab"] = "@block.outer",
          ["ib"] = "@block.inner",
          ["as"] = "@statement.outer",
          ["is"] = "@scopename.inner",
          ["aA"] = "@attribute.outer",
          ["iA"] = "@attribute.inner",
          ["aF"] = "@frame.outer",
          ["iF"] = "@frame.inner",
        },
      },
    },
    textsubjects = {
      enable = false,
      keymaps = { ["."] = "textsubjects-smart", [";"] = "textsubjects-big" },
    },
    playground = {
      enable = false,
      disable = {},
      updatetime = 25,         -- Debounced time for highlighting nodes in the playground from source code
      persist_queries = false, -- Whether the query persists across vim sessions
      keybindings = {
        toggle_query_editor = "o",
        toggle_hl_groups = "i",
        toggle_injected_languages = "t",
        toggle_anonymous_nodes = "a",
        toggle_language_display = "I",
        focus_language = "f",
        unfocus_language = "F",
        update = "R",
        goto_node = "<cr>",
        show_help = "?",
      },
    },
    rainbow = {
      enable = true,
      extended_mode = false, -- Highlight also non-parentheses delimiters, boolean or table: lang -> boolean
      colors = {
        "DodgerBlue",
        "Orchid",
        "Gold",
      },
    },
  }
end

return M
