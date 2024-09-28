local which_key = require("which-key")

which_key.add({
  { "<leader>a", group = "AI" },

  { "<leader>ac", group = "Code Companion" },
  { "<leader>acc", "<cmd>CodeCompanionToggle<cr>", desc = "Toggle chat" },
  { "<leader>acc", "<cmd>CodeCompanionChat Add<cr>", desc = "Add code to chat", mode = "v" },
  { "<leader>aci", "<cmd>CodeCompanion<cr>", desc = "Toggle inline chat" },

  { "<leader>aa", group = "Avante" },
  { "<leader>aac", "<cmd>AvanteToggle<cr>", desc = "Toggle Avante Chat" },
  { "<leader>acr", "<cmd>AvanteClear<cr>", desc = "Clear Avante" },
  { "<leader>aaa", "<cmd>AvanteAsk<cr>", desc = "Ask Avante", mode = "v" },

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
  { "<leader>gg", "<cmd>Neogit<CR>", desc = "Git Screen" },
  { "<leader>gb", require("gitsigns").blame_line, desc = "Blame" },
  { "<leader>gR", require("gitsigns").reset_buffer, desc = "Reset Buffer" },
  { "<leader>gd", "<cmd>Gitsigns diffthis HEAD<cr>", desc = "Git Diff" },
  -- { "<leader>gw", require("telescope").extensions.git_worktree.git_worktrees, desc = "Git Worktrees" },
  -- { "<leader>gn", require("telescope").extensions.git_worktree.create_git_worktree, desc = "Create Worktree" },

  { "<leader>gh", group = "Git hunk" },
  { "<leader>ghj", "<cmd>Gitsigns next_hunk<cr>", desc = "Next Hunk" },
  { "<leader>ghk", "<cmd>Gitsigns prev_hunk<cr>", desc = "Prev Hunk" },
  { "<leader>ghp", require("gitsigns").preview_hunk, desc = "Preview Hunk" },
  { "<leader>ghr", require("gitsigns").reset_hunk, desc = "Reset Hunk" },
  { "<leader>ghs", require("gitsigns").stage_hunk, desc = "Stage Hunk" },
  { "<leader>ghu", require("gitsigns").undo_stage_hunk, desc = "Undo Stage Hunk" },

  { "<leader>l", group = "LSP" },
  { "<leader>la", vim.lsp.buf.code_action, desc = "Code Action" },
  { "<leader>ld", "<cmd>Telescope diagnostics<cr>", desc = "Diagnostics" },
  {
    "<leader>le",
    function()
      require("telescope.builtin").diagnostics({ severity = vim.diagnostic.severity.ERROR })
    end,
    desc = "Diagnostics",
  },

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
  {
    "<leader>trs",
    function()
      require("resession").save()
    end,
    desc = "Save Session",
  },

  { "<leader>x", group = "Trouble" },
  { "<leader>xd", "<cmd>Trouble diagnostics toggle<cr>", desc = "Toggle Trouble diagnostics" },
  { "<leader>xq", "<cmd>Trouble quickfix toggle<cr>", desc = "Toggle Trouble diagnostics" },
})
