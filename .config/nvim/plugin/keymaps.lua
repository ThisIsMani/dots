local set = require("options.utils").set_keymap

-- My thing
set("i", "jj", "<ESC>", "Return to normal mode")

-- Buffer navigation
set("n", "<S-l>", ":bnext<CR>", "Next buffer")
set("n", "<S-h>", ":bprevious<CR>", "Previous buffer")

-- Jumplist navigation
set("n", "go", "<C-o>", "Jump back")
set("n", "gi", "<C-i>", "Jump forward")

-- Visual mode specific keymaps
set("v", "<", "<gv", "Indent left")
set("v", ">", ">gv", "Indent right")
set("v", "p", '"_dP', "Paste without yanking")

-- Basic movement keybinds, these make navigating splits easy for me
set("n", "<c-j>", ":FocusSplitDown<CR>", "Go to below split")
set("n", "<c-k>", ":FocusSplitUp<CR>", "Go to above split")
set("n", "<c-l>", ":FocusSplitRight<CR>", "Go to right split")
set("n", "<c-h>", ":FocusSplitLeft<CR>", "Go to left split")

-- These mappings control the size of splits (height/width)
set("n", "<c-,>", "<c-w>5<", "Decrease split size")
set("n", "<c-.>", "<c-w>5>", "Increase split size")
set("n", "<c-t>", "<C-W>+", "Increase split size")
set("n", "<c-s>", "<C-W>-", "Decrease split size")

set({ "n", "x", "o" }, "s", "<cmd>lua require('flash').jump()<cr>", "Search for letter")
set({ "n", "x", "o" }, "S", "<cmd>lua require('flash').treesitter()<cr>", "Select text object")
set("o", "r", "<cmd>lua require('flash').remote()<cr>", "Search for letter")
set({ "x", "o" }, "R", "<cmd>lua require('flash').treesitter_search()<cr>", "Select text object")

set("x", "il", "^og_", "Select line inner")
set("o", "il", "<CMD>normal vil<CR>", "Select line inner")
set("x", "al", "V", "Select line outer")
set("o", "al", "<CMD>normal val<CR>", "Select line outer")
