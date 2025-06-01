local which_key = require("which-key")
local utils = require("options.utils")

local gitsigns = require("gitsigns")
local diffview = require("diffview")
local copilot_chat = require("CopilotChat")
local focus = require("focus")
local oil = require("oil")
local zen_mode = require("zen-mode")
local telescope = require("telescope.builtin")
local telescope_resession = require("telescope").extensions.resession
local recession = require("resession")
local trouble = require("trouble")
local bufferline = require("bufferline")
-- local avante = require("avante")

local wo = require("options.utils").with_opts

local cmd = function(command)
  return function()
    vim.cmd(command)
  end
end

which_key.add({
  -- { "<leader>a", group = "Avante" },
  -- { "<leader>aa", wo(avante.toggle, {}), desc = "Open Avante Chat" },

  { "<leader>c", group = "Copilot" },
  { "<leader>cc", copilot_chat.toggle, desc = "Open chat", mode = "v" },
  { "<leader>cm", copilot_chat.select_model, desc = "Select Copilot model" },
  { "<leader>cs", copilot_chat.save, desc = "Save Copilot chat" },
  { "<leader>cl", copilot_chat.load, desc = "Load Copilot chat" },

  { "<leader>w", group = "Window" },
  { "<leader>wq", utils.smart_quit, desc = "Quit" },
  { "<leader>wl", wo(focus.split_command, "l"), desc = "Go/Split right" },
  { "<leader>wh", wo(focus.split_command, "h"), desc = "Go/Split left" },
  { "<leader>wk", wo(focus.split_command, "k"), desc = "Go/Split up" },
  { "<leader>wj", wo(focus.split_command, "j"), desc = "Go/Split bottom" },
  { "<leader>wz", zen_mode.toggle, desc = "Zen Mode" },

  { "<leader>n", group = "Neovim helpers" },
  { "<leader>nh", cmd("noh"), desc = "No Highlight" },
  { "<leader>ne", oil.open_float, desc = "Oil" },
  { "<leader>nq", cmd("qa"), desc = "Quit Neovim" },

  { "<leader>nu", group = "Neovim utils" },
  { "<leader>nuy", utils.copy_path, desc = "Copy file path" },
  { "<leader>nup", utils.print_path, desc = "Print file path" },

  { "<leader>f", group = "File" },
  { "<leader>ff", telescope.find_files, desc = "Find file" },
  { "<leader>fd", cmd("DiffviewOpen HEAD -- %"), desc = "File diff" },

  { "<leader>b", group = "Buffers" },
  { "<leader>bb", telescope.buffers, desc = "Find" },
  { "<leader>bd", utils.buf_kill, desc = "Delete buffer" },
  { "<leader>bh", wo(bufferline.close_in_direction, "left"), desc = "Close all to the left" },
  { "<leader>bl", wo(bufferline.close_in_direction, "right"), desc = "Close all to the right" },
  { "<leader>bD", cmd("%bdelete"), desc = "Delete all buffers" },
  { "<leader>bw", cmd("w!"), desc = "Save buffer" },
  { "<leader>bW", cmd("noa w!"), desc = "Save buffer without autocmds" },

  { "<leader>g", group = "Git" },
  { "<leader>gg", "<cmd>Neogit<CR>", desc = "Git Screen" },
  { "<leader>gb", gitsigns.blame_line, desc = "Blame" },
  { "<leader>gR", gitsigns.reset_buffer, desc = "Reset Buffer" },
  { "<leader>gd", diffview.open, desc = "Git Diff" },

  { "<leader>gh", group = "Git hunk" },
  { "<leader>ghj", gitsigns.next_hunk, desc = "Next Hunk" },
  { "<leader>ghk", gitsigns.prev_hunk, desc = "Prev Hunk" },
  { "<leader>ghp", gitsigns.preview_hunk, desc = "Preview Hunk" },
  { "<leader>ghr", gitsigns.reset_hunk, desc = "Reset Hunk" },
  { "<leader>ghs", gitsigns.stage_hunk, desc = "Stage Hunk" },
  { "<leader>ghu", gitsigns.undo_stage_hunk, desc = "Undo Stage Hunk" },

  { "<leader>l", group = "LSP" },
  { "<leader>la", vim.lsp.buf.code_action, desc = "Code Action" },
  { "<leader>ld", telescope.diagnostics, desc = "Diagnostics" },
  { "<leader>le", wo(telescope.diagnostics, { severity = vim.diagnostic.severity.ERROR }), desc = "Diagnostics" },
  { "<leader>lf", wo(vim.lsp.buf.format, { async = true }), desc = "Format" },
  { "<leader>li", cmd("LspInfo"), desc = "Info" },
  { "<leader>lI", utils.toggle_inlay_hint, desc = "Toggle Inlay Hints" },
  { "<leader>ll", vim.lsp.codelens.run, desc = "CodeLens Action" },
  { "<leader>lL", utils.toggle_lsp_lines, desc = "Toggle Lsp Lines" },
  { "<leader>lr", vim.lsp.buf.rename, desc = "Rename" },
  { "<leader>lR", cmd("LspRestart"), desc = "Lsp Restart" },
  { "<leader>ls", telescope.lsp_document_symbols, desc = "Document Symbols" },
  { "<leader>lS", telescope.lsp_workspace_symbols, desc = "Workspace Symbols" },

  { "<leader>lc", group = "Calls" },
  { "<leader>lco", telescope.lsp_outgoing_calls, desc = "Outgoing calls" },
  { "<leader>lci", telescope.lsp_incoming_calls, desc = "Incoming calls" },

  { "<leader>t", group = "Telescope" },
  { "<leader>ta", telescope.builtin, desc = "Search all options" },
  { "<leader>tg", telescope.live_grep, desc = "Find text" },
  { "<leader>ts", telescope.grep_string, desc = "Find string under cursor" },
  { "<leader>tt", telescope.resume, desc = "Resume previous search" },

  { "<leader>tr", group = "Recession" },
  { "<leader>trf", telescope_resession.resession, desc = "Find Session" },
  { "<leader>trs", recession.save, desc = "Save Session" },

  { "<leader>x", group = "Trouble" },
  { "<leader>xd", wo(trouble.toggle, "diagnostics"), desc = "Toggle Trouble diagnostics" },
  { "<leader>xq", wo(trouble.toggle, "quickfix"), desc = "Toggle Trouble diagnostics" },
})
