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
set("n", "<c-j>", "<c-w><c-j>")
set("n", "<c-k>", "<c-w><c-k>")
set("n", "<c-l>", "<c-w><c-l>")
set("n", "<c-h>", "<c-w><c-h>")

-- These mappings control the size of splits (height/width)
set("n", "<c-,>", "<c-w>5<")
set("n", "<c-.>", "<c-w>5>")
set("n", "<c-t>", "<C-W>+")
set("n", "<c-s>", "<C-W>-")

set({ "n", "x", "o" }, "s", "<cmd>lua require('flash').jump()<cr>")
set({ "n", "x", "o" }, "S", "<cmd>lua require('flash').treesitter()<cr>")
set("o", "r", "<cmd>lua require('flash').remote()<cr>")
set({ "x", "o" }, "R", "<cmd>lua require('flash').treesitter_search()<cr>")
