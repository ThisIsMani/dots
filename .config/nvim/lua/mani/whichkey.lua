local status_ok, which_key = pcall(require, "which-key")
if not status_ok then
  return
end

local icons = require("mani.icons")

local setup = {
  plugins = {
    marks = false,     -- shows a list of your marks on ' and `
    registers = false, -- shows your registers on " in NORMAL or <C-r> in INSERT mode
    -- the presets plugin, adds help for a bunch of default keybindings in Neovim
    -- No actual key bindings are created
    presets = {
      operators = true,                              -- adds help for operators like d, y, ...
      motions = true,                                -- adds help for motions
      text_objects = true,                           -- help for text objects triggered after entering an operator
      windows = true,                                -- default bindings on <c-w>
      nav = true,                                    -- misc bindings to work with windows
      z = true,                                      -- bindings for folds, spelling and others prefixed with z
      g = true,                                      -- bindings for prefixed with g
    },
    spelling = { enabled = true, suggestions = 20 }, -- use which-key for spelling hints
  },
  icons = {
    breadcrumb = icons.ui.DoubleChevronRight, -- symbol used in the command line area that shows your active key combo
    separator = icons.ui.BoldArrowRight,      -- symbol used between a key and it's label
    group = icons.ui.Plus,                    -- symbol prepended to a group
  },
  popup_mappings = {
    scroll_down = "<c-d>", -- binding to scroll down inside the popup
    scroll_up = "<c-u>",   -- binding to scroll up inside the popup
  },
  window = {
    border = "single",        -- none, single, double, shadow
    position = "bottom",      -- bottom, top
    margin = { 1, 0, 1, 0 },  -- extra window margin [top, right, bottom, left]
    padding = { 2, 2, 2, 2 }, -- extra window padding [top, right, bottom, left]
    winblend = 0,
  },
  layout = {
    height = { min = 4, max = 25 },                                             -- min and max height of the columns
    width = { min = 20, max = 50 },                                             -- min and max width of the columns
    spacing = 3,                                                                -- spacing between columns
    align = "left",                                                             -- align columns left, center or right
  },
  hidden = { "<silent>", "<cmd>", "<Cmd>", "<CR>", "call", "lua", "^:", "^ " }, -- hide mapping boilerplate
  ignore_missing = false,                                                       -- enable this to hide mappings for which you didn't specify a label
  show_help = true,                                                             -- show help message on the command line when the popup is visible
  triggers = "auto",                                                            -- automatically setup triggers
  -- triggers = {"<leader>"} -- or specify a list manually
  triggers_blacklist = {
    -- list of mode / prefixes that should never be hooked by WhichKey
    -- this is mostly relevant for key maps that start with a native binding
    -- most people should not need to change this
    i = { "j", "k" },
    v = { "j", "k" },
  },
}
local opts = {
  mode = "n",     -- NORMAL mode
  prefix = "<leader>",
  buffer = nil,   -- Global mappings. Specify a buffer number for buffer local mappings
  silent = true,  -- use `silent` when creating keymaps
  noremap = true, -- use `noremap` when creating keymaps
  nowait = true,  -- use `nowait` when creating keymaps
}

local vopts = {
  mode = "v",     -- VISUAL mode
  prefix = "<leader>",
  buffer = nil,   -- Global mappings. Specify a buffer number for buffer local mappings
  silent = true,  -- use `silent` when creating keymaps
  noremap = true, -- use `noremap` when creating keymaps
  nowait = true,  -- use `nowait` when creating keymaps
}

local vmappings = {
  ["/"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment toggle" },
}

local mappings = {
  ["a"] = { "<cmd>Alpha<cr>", "Alpha" },
  ["w"] = { "<cmd>w!<CR>", "Save" },
  ["q"] = { "<cmd>lua require('mani.functions').smart_quit()<CR>", "Quit" },
  ["e"] = { "<cmd>NvimTreeToggle<cr>", "Explorer" },
  ["c"] = { "<cmd>lua require('mani.functions').buf_kill 'bd'<CR>", "Close Buffer" },
  ["f"] = { "<cmd>lua require('mani.functions').find_project_files()<CR>", "Find File" },
  ["F"] = { "<cmd>Telescope live_grep<cr>", "Find files" },
  ["h"] = { "<cmd>nohlsearch<CR>", "No Highlight" },
  b = {
    name = "Buffers",
    j = { "<cmd>BufferLinePick<cr>", "Jump" },
    f = { "<cmd>Telescope buffers<cr>", "Find" },
    c = { "<cmd>BufferLinePickClose<cr>", "Pick which buffer to close" },
    h = { "<cmd>BufferLineCloseLeft<cr>", "Close all to the left" },
    l = { "<cmd>BufferLineCloseRight<cr>", "Close all to the right" },
    D = { "<cmd>BufferLineSortByDirectory<cr>", "Sort by directory" },
    L = { "<cmd>BufferLineSortByExtension<cr>", "Sort by extension" },
    C = { "<cmd>%bdelete<cr>", "Close all buffers" },
  },
  p = {
    name = "Packer",
    c = { "<cmd>PackerCompile<cr>", "Compile" },
    i = { "<cmd>PackerInstall<cr>", "Install" },
    s = { "<cmd>PackerSync<cr>", "Sync" },
    S = { "<cmd>PackerStatus<cr>", "Status" },
    u = { "<cmd>PackerUpdate<cr>", "Update" },
  },
  g = {
    name = "Git",
    g = { "<cmd>DiffviewOpen<CR>", "Git Screen" },
    j = { "<cmd>lua require 'gitsigns'.next_hunk({navigation_message = false})<cr>", "Next Hunk" },
    k = { "<cmd>lua require 'gitsigns'.prev_hunk({navigation_message = false})<cr>", "Prev Hunk" },
    l = { "<cmd>lua require 'gitsigns'.blame_line()<cr>", "Blame" },
    p = { "<cmd>lua require 'gitsigns'.preview_hunk()<cr>", "Preview Hunk" },
    r = { "<cmd>lua require 'gitsigns'.reset_hunk()<cr>", "Reset Hunk" },
    R = { "<cmd>lua require 'gitsigns'.reset_buffer()<cr>", "Reset Buffer" },
    s = { "<cmd>lua require 'gitsigns'.stage_hunk()<cr>", "Stage Hunk" },
    u = {
      "<cmd>lua require 'gitsigns'.undo_stage_hunk()<cr>",
      "Undo Stage Hunk",
    },
    o = { "<cmd>Telescope git_status<cr>", "Open changed file" },
    b = { "<cmd>Telescope git_branches<cr>", "Checkout branch" },
    c = { "<cmd>Telescope git_commits<cr>", "Checkout commit" },
    C = { "<cmd>Telescope git_bcommits<cr>", "Checkout commit(for current file)" },
    d = { "<cmd>Gitsigns diffthis HEAD<cr>", "Git Diff" },
  },
  l = {
    name = "LSP",
    a = { "<cmd>lua vim.lsp.buf.code_action()<cr>", "Code Action" },
    d = { "<cmd>Telescope diagnostics bufnr=0<cr>", "Buffer Diagnostics" },
    w = { "<cmd>Telescope diagnostics<cr>", "Diagnostics" },
    f = { "<cmd>lua vim.lsp.buf.format{async=true}<cr>", "Format" },
    i = { "<cmd>LspInfo<cr>", "Info" },
    I = { "<cmd>Mason<cr>", "Mason Info" },
    j = { vim.diagnostic.goto_next, "Next Diagnostic" },
    k = { vim.diagnostic.goto_prev, "Prev Diagnostic" },
    l = { vim.lsp.codelens.run, "CodeLens Action" },
    L = { "<cmd>lua require('lsp_lines').toggle()<cr>", "Toggle Lsp Lines" },
    q = { vim.diagnostic.setloclist, "Quickfix" },
    r = { vim.lsp.buf.rename, "Rename" },
    R = { "<cmd>LspRestart<cr>", "Lsp Restart" },
    s = { "<cmd>Telescope lsp_document_symbols<cr>", "Document Symbols" },
    S = { "<cmd>Telescope lsp_dynamic_workspace_symbols<cr>", "Workspace Symbols" },
    e = { "<cmd>Telescope quickfix<cr>", "Telescope Quickfix" },
    c = {
      name = "Calls",
      o = { "<cmd>Telescope lsp_outgoing_calls<cr>", "Outgoing calls" },
      i = { "<cmd>Telescope lsp_incoming_calls<cr>", "Incoming calls" },
    }
  },
  s = {
    name = "Search",
    b = { "<cmd>Telescope git_branches<cr>", "Checkout branch" },
    c = { "<cmd>Telescope colorscheme<cr>", "Colorscheme" },
    f = { "<cmd>Telescope find_files<cr>", "Find File" },
    h = { "<cmd>Telescope help_tags<cr>", "Find Help" },
    H = { "<cmd>Telescope highlights<cr>", "Find highlight groups" },
    M = { "<cmd>Telescope man_pages<cr>", "Man Pages" },
    r = { "<cmd>Telescope oldfiles<cr>", "Open Recent File" },
    R = { "<cmd>Telescope registers<cr>", "Registers" },
    t = { "<cmd>Telescope live_grep<cr>", "Text" },
    k = { "<cmd>Telescope keymaps<cr>", "Keymaps" },
    C = { "<cmd>Telescope commands<cr>", "Commands" },
    p = { "<cmd>lua require('telescope').extensions.projects.projects()<cr>", "Projects" },
  },
  T = {
    name = "Treesitter",
    i = { ":TSConfigInfo<cr>", "Info" },
  },
  t = {
    name = "Terminal",
    f = { "<cmd>ToggleTerm direction=float<cr>", "Float" },
    h = { "<cmd>ToggleTerm size=10 direction=horizontal<cr>", "Horizontal" },
    v = { "<cmd>ToggleTerm size=80 direction=vertical<cr>", "Vertical" },
  },
  j = {
    name = "Jump",
    f = { "<cmd>lua require('mani.functions').hop_functions.find_next()<CR>", "Jump to Char After" },
    F = { "<cmd>lua require('mani.functions').hop_functions.find_prev()<CR>", "Jump to Char Before" },
    t = { "<cmd>lua require('mani.functions').hop_functions.goto_next()<CR>", "Goto to Char After" },
    T = { "<cmd>lua require('mani.functions').hop_functions.goto_prev()<CR>", "Goto to Char Before" },
    w = { "<cmd>HopWordAC<CR>", "Jump to Word After" },
    W = { "<cmd>HopWordBC<CR>", "Jump to Word Before" },
    a = { "<cmd>HopWord<CR>", "Jump to Word" },
    v = { "<cmd>HopVertical<CR>", "Jump Vertical" },
    l = { "<cmd>HopLineStart<CR>", "Jump to Line" },
    j = { "<cmd>HopPattern<CR>", "Jump to Pattern" },
  },
  z = { "<cmd>ZenMode<cr>", "Zen Mode" }
}

which_key.setup(setup)
which_key.register(mappings, opts)
which_key.register(vmappings, vopts)
