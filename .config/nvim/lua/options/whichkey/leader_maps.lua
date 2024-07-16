local which_key = require("which-key")

local lopts = {
  mode = "n", -- NORMAL mode
  prefix = "<leader>",
  buffer = nil, -- Global mappings. Specify a buffer number for buffer local mappings
  silent = true, -- use `silent` when creating keymaps
  noremap = true, -- use `noremap` when creating keymaps
  nowait = true, -- use `nowait` when creating keymaps
}

local lmappings = {
  ["w"] = { "<cmd>w!<CR>", "Save" },
  ["q"] = { "<cmd>lua require('options.utils').smart_quit()<CR>", "Quit" },
  ["e"] = { "<cmd>Oil --float<cr>", "Explorer" },
  ["c"] = { "<cmd>lua require('mani.functions').buf_kill 'bd'<CR>", "Close Buffer" },
  ["f"] = { "<cmd>Telescope find_files<CR>", "Find file" },
  ["S"] = { "<cmd>Telescope grep_string<CR>", "Find string under cursor" },
  ["F"] = { "<cmd>Telescope live_grep<cr>", "Find text" },
  -- ["R"] = { "<cmd>Telescope grep_string<cr>", "Find regex" },
  ["h"] = { "<cmd>nohlsearch<CR>", "No Highlight" },
  ["m"] = { "<cmd>Telescope marks<CR>", "List marks" },
  b = {
    name = "Buffers",
    -- j = { "<cmd>BufferLinePick<cr>", "Jump" },
    j = { "<cmd>Telescope buffers<cr>", "Find" },
    c = { "<cmd>BufferLinePickClose<cr>", "Pick which buffer to close" },
    h = { "<cmd>BufferLineCloseLeft<cr>", "Close all to the left" },
    l = { "<cmd>BufferLineCloseRight<cr>", "Close all to the right" },
    D = { "<cmd>BufferLineSortByDirectory<cr>", "Sort by directory" },
    L = { "<cmd>BufferLineSortByExtension<cr>", "Sort by extension" },
    C = { "<cmd>%bdelete<cr>", "Close all buffers" },
  },
  g = {
    name = "Git",
    g = { "<cmd>tab Git<CR>", "Git Screen" },
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
    o = { "<cmd>Telescope git_status<cr>", "Git status" },
    b = { "<cmd>Telescope git_branches<cr>", "Checkout branch" },
    c = { "<cmd>Telescope git_commits<cr>", "Checkout commit" },
    C = { "<cmd>Telescope git_bcommits<cr>", "Checkout commit(for current file)" },
    d = { "<cmd>Gitsigns diffthis HEAD<cr>", "Git Diff" },
    w = { "<cmd>lua require('telescope').extensions.git_worktree.git_worktrees()<cr>", "Git Worktrees" },
    n = { "<cmd>lua require 'telescope'.extensions.git_worktree.create_git_worktree()<cr>", "Create Worktree" },
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
    S = { "<cmd>Telescope lsp_live_workspace_symbols<cr>", "Workspace Symbols" },
    e = { "<cmd>Telescope quickfix<cr>", "Quickfix list" },
    c = {
      name = "Calls",
      o = { "<cmd>Telescope lsp_outgoing_calls<cr>", "Outgoing calls" },
      i = { "<cmd>Telescope lsp_incoming_calls<cr>", "Incoming calls" },
    },
  },
  s = {
    name = "Search",
    a = { "<cmd>Telescope builtin<cr>", "Search Searchable" },
    b = { "<cmd>Telescope git_branches<cr>", "Checkout branch" },
    c = { "<cmd>Telescope colorschemes<cr>", "Colorscheme" },
    h = { "<cmd>Telescope help_tags<cr>", "Find Help" },
    H = { "<cmd>Telescope highlights<cr>", "Find highlight groups" },
    M = { "<cmd>Telescope man_pages<cr>", "Man Pages" },
    r = { "<cmd>Telescope oldfiles<cr>", "Open Recent File" },
    R = { "<cmd>Telescope registers<cr>", "Registers" },
    k = { "<cmd>Telescope keymaps<cr>", "Keymaps" },
    C = { "<cmd>Telescope commands<cr>", "Commands" },
    p = { "<cmd>Telescope planets<cr>", "Planets" },
  },
  r = {
    name = "Resession",
    f = { "<CMD>Telescope resession<CR>", "Find Session" },
    s = { "<CMD>lua require('resession').save()<CR>", "Save Session" },
  },
  t = {
    name = "Terminal",
    f = { "<cmd>ToggleTerm direction=float<cr>", "Float" },
    h = { "<cmd>ToggleTerm size=10 direction=horizontal<cr>", "Horizontal" },
    v = { "<cmd>ToggleTerm size=80 direction=vertical<cr>", "Vertical" },
  },
  z = { "<cmd>ZenMode<cr>", "Zen Mode" },
}

which_key.register(lmappings, lopts)
