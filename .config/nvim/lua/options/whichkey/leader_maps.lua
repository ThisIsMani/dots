local which_key = require("which-key")

which_key.add({
  { "<leader>a", group = "AI" },

  { "<leader>ac", group = "Copilot" },
  { "<leader>acc", "<cmd>CopilotChatToggle<cr>", desc = "Toggle Copilot Chat" },
  { "<leader>acd", "<cmd>CopilotChatFixDiagnostic<cr>", desc = "Fix diagnostic" },
  { "<leader>acr", "<cmd>CopilotChatReview<cr>", desc = "Review code", mode = "v" },
  { "<leader>aco", "<cmd>CopilotChatOptimize<cr>", desc = "Optimize code", mode = "v" },
  { "<leader>ace", "<cmd>CopilotChatExplain<cr>", desc = "Explain code", mode = "v" },

  { "<leader>aa", group = "Avante" },
  { "<leader>aac", "<cmd>AvanteToggle<cr>", desc = "Toggle Avante Chat" },
  { "<leader>acr", "<cmd>AvanteClear<cr>", desc = "Clear Avante" },

  { "<leader>w", group = "Window" },
  { "<leader>wq", require("options.utils").smart_quit, desc = "Quit" },
  { "<leader>wl", "<cmd>FocusSplitRight<CR>", desc = "Go/Split right" },
  { "<leader>wh", "<cmd>FocusSplitLeft<CR>", desc = "Go/Split left" },
  { "<leader>wk", "<cmd>FocusSplitUp<CR>", desc = "Go/Split up" },
  { "<leader>wj", "<cmd>FocusSplitDown<CR>", desc = "Go/Split bottom" },
  { "<leader>wz", "<cmd>ZenMode<cr>", desc = "Zen Mode" },

  { "<leader>n", group = "Neovim helpers" },
  { "<leader>nh", "<cmd>nohlsearch<CR>", desc = "No Highlight" },
  { "<leader>ne", "<cmd>Oil --float<cr>", desc = "Oil" },

  { "<leader>f", group = "File" },
  { "<leader>ff", "<cmd>Telescope find_files<CR>", desc = "Find file" },

  { "<leader>b", group = "Buffers" },
  { "<leader>bf", "<cmd>Telescope buffers<cr>", desc = "Find" },
  { "<leader>bd", require("options.utils").buf_kill, desc = "Delete buffer" },
  { "<leader>bh", "<cmd>BufferLineCloseLeft<cr>", desc = "Close all to the left" },
  { "<leader>bl", "<cmd>BufferLineCloseRight<cr>", desc = "Close all to the right" },
  { "<leader>bD", "<cmd>%bdelete<cr>", desc = "Delete all buffers" },
  { "<leader>bw", "<cmd>w!<cr>", desc = "Save buffer" },

  { "<leader>g", group = "Git" },
  { "<leader>gg", "<cmd>DiffviewOpen<CR>", desc = "Git Screen" },
  { "<leader>gb", "<cmd>lua require 'gitsigns'.blame_line()<cr>", desc = "Blame" },
  { "<leader>gR", "<cmd>lua require 'gitsigns'.reset_buffer()<cr>", desc = "Reset Buffer" },
  { "<leader>gs", "<cmd>Telescope git_status<cr>", desc = "Git status" },
  { "<leader>gc", "<cmd>Telescope git_commits<cr>", desc = "Checkout commit" },
  { "<leader>gd", "<cmd>Gitsigns diffthis HEAD<cr>", desc = "Git Diff" },
  -- { "<leader>gw", require("telescope").extensions.git_worktree.git_worktrees, desc = "Git Worktrees" },
  -- { "<leader>gn", require("telescope").extensions.git_worktree.create_git_worktree, desc = "Create Worktree" },

  { "<leader>gh", group = "Git hunk" },
  { "<leader>ghj", "<cmd>Gitsigns next_hunk<cr>", desc = "Next Hunk" },
  { "<leader>ghk", "<cmd>Gitsigns prev_hunk<cr>", desc = "Prev Hunk" },
  { "<leader>ghp", "<cmd>lua require 'gitsigns'.preview_hunk()<cr>", desc = "Preview Hunk" },
  { "<leader>ghr", "<cmd>lua require 'gitsigns'.reset_hunk()<cr>", desc = "Reset Hunk" },
  { "<leader>ghs", "<cmd>lua require 'gitsigns'.stage_hunk()<cr>", desc = "Stage Hunk" },
  { "<leader>ghu", "<cmd>lua require 'gitsigns'.undo_stage_hunk()<cr>", desc = "Undo Stage Hunk" },

  { "<leader>l", group = "LSP" },
  { "<leader>la", vim.lsp.buf.code_action, desc = "Code Action" },
  { "<leader>ld", "<cmd>Telescope diagnostics bufnr=0<cr>", desc = "Buffer Diagnostics" },
  { "<leader>lw", "<cmd>Telescope diagnostics<cr>", desc = "Diagnostics" },
  {
    "<leader>lf",
    function()
      vim.lsp.buf.format({ async = true })
    end,
    desc = "Format",
  },
  { "<leader>li", "<cmd>LspInfo<cr>", desc = "Info" },
  { "<leader>ll", vim.lsp.codelens.run, desc = "CodeLens Action" },
  -- { "<leader>lL", require("lsp_lines").toggle, desc = "Toggle Lsp Lines" },
  { "<leader>lr", vim.lsp.buf.rename, desc = "Rename" },
  { "<leader>lR", "<cmd>LspRestart<cr>", desc = "Lsp Restart" },
  { "<leader>ls", "<cmd>Telescope lsp_document_symbols<cr>", desc = "Document Symbols" },
  { "<leader>lS", "<cmd>Telescope lsp_live_workspace_symbols<cr>", desc = "Workspace Symbols" },

  { "<leader>lc", group = "Calls" },
  { "<leader>lco", "<cmd>Telescope lsp_outgoing_calls<cr>", desc = "Outgoing calls" },
  { "<leader>lci", "<cmd>Telescope lsp_incoming_calls<cr>", desc = "Incoming calls" },

  { "<leader>t", group = "Telescope" },
  { "<leader>ta", "<cmd>Telescope builtin<cr>", desc = "Search all options" },
  { "<leader>tg", "<cmd>Telescope live_grep<cr>", desc = "Find text" },
  { "<leader>ts", "<cmd>Telescope grep_string<CR>", desc = "Find string under cursor" },

  { "<leader>tr", group = "Recession" },
  { "<leader>trf", "<CMD>Telescope resession<CR>", desc = "Find Session" },
  { "<leader>trs", require("resession").save, desc = "Save Session" },
})
