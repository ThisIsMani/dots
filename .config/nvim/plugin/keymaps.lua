local set = vim.keymap.set

-- My thing
set("i", "jj", "<ESC>")

-- Buffer navigation
set("n", "<S-l>", ":bnext<CR>")
set("n", "<S-h>", ":bprevious<CR>")

-- Jumplist navigation
set("n", "go", "<C-o>")
set("n", "gi", "<C-i>")

-- Visual mode specific keymaps
set("v", "<", "<gv")
set("v", ">", ">gv")
set("v", "p", '"_dP')

-- Basic movement keybinds, these make navigating splits easy for me
set("n", "<c-j>", ":FocusSplitDown<CR>")
set("n", "<c-k>", ":FocusSplitUp<CR>")
set("n", "<c-l>", ":FocusSplitRight<CR>")
set("n", "<c-h>", ":FocusSplitLeft<CR>")

-- These mappings control the size of splits (height/width)
set("n", "<c-,>", "<c-w>5<")
set("n", "<c-.>", "<c-w>5>")
set("n", "<c-t>", "<C-W>+")
set("n", "<c-s>", "<C-W>-")

set({ "n", "x", "o" }, "s", "<cmd>lua require('flash').jump()<cr>")
set({ "n", "x", "o" }, "S", "<cmd>lua require('flash').treesitter()<cr>")
set("o", "r", "<cmd>lua require('flash').remote()<cr>")
set({ "x", "o" }, "R", "<cmd>lua require('flash').treesitter_search()<cr>")

set("x", "il", "^og_")
set("o", "il", "<CMD>normal vil<CR>")
set("x", "al", "V")
set("o", "al", "<CMD>normal val<CR>")
