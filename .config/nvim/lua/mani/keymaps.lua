local opts = { noremap = true, silent = true }

-- local term_opts = { silent = true }

local keymap = vim.api.nvim_set_keymap

keymap("", "<Space>", "<Nop>", opts)
vim.g.mapleader = " "
vim.g.maplocalleader = " "

--Insert Mode
keymap("i", "jj", "<ESC>", opts)
keymap("i", "<A-j>", "<Esc>:m .+1<CR>==gi", opts)
keymap("i", "<A-k>", "<Esc>:m .-2<CR>==gi", opts)
keymap("i", "<A-Up>", "<C-\\><C-N><C-w>k", opts)
keymap("i", "<A-Down>", "<C-\\><C-N><C-w>j", opts)
keymap("i", "<A-Left>", "<C-\\><C-N><C-w>h", opts)
keymap("i", "<A-Right>", "<C-\\><C-N><C-w>l", opts)

-- keymap("n", "<C-h>", "<C-w>h", opts)
-- keymap("n", "<C-j>", "<C-w>j", opts)
-- keymap("n", "<C-k>", "<C-w>k", opts)
-- keymap("n", "<C-l>", "<C-w>l", opts)

keymap('n', "<C-h>", ':FocusSplitLeft<CR>', opts)
keymap('n', "<C-j>", ':FocusSplitDown<CR>', opts)
keymap('n', "<C-k>", ':FocusSplitUp<CR>', opts)
keymap('n', "<C-l>", ':FocusSplitRight<CR>', opts)

-- -- Resize with arrows
-- keymap("n", "<A-Up>", ":resize -2<CR>", opts)
-- keymap("n", "<A-Down>", ":resize +2<CR>", opts)
-- keymap("n", "<A-Left>", ":vertical resize -2<CR>", opts)
-- keymap("n", "<A-Right>", ":vertical resize +2<CR>", opts)

-- Move current line / block with Alt-j/k a la vscode.
keymap("n", "<A-k>", ":m .-2<CR>==", opts)
keymap("n", "<A-j>", ":m .+1<CR>==", opts)

-- QuickFix
keymap("n", "]q", ":cnext<CR>", opts)
keymap("n", "[q", ":cprev<CR>", opts)
keymap("n", "<C-q>", ":call QuickFixToggle()<CR>", opts)

-- Navigate buffers
keymap("n", "<S-l>", ":bnext<CR>", opts)
keymap("n", "<S-h>", ":bprevious<CR>", opts)

-- Move forward and backward
keymap("n", "go", "<C-o>", opts)
keymap("n", "gi", "<C-i>", opts)

--Terminal Mode
keymap("t", "<C-h>", "<C-\\><C-N><C-w>h", opts)
keymap("t", "<C-j>", "<C-\\><C-N><C-w>j", opts)
keymap("t", "<C-k>", "<C-\\><C-N><C-w>k", opts)
keymap("t", "<C-l>", "<C-\\><C-N><C-w>l", opts)

--Visual Mode
keymap("v", "<", "<gv", opts)
keymap("v", ">", ">gv", opts)
keymap("v", "p", '"_dP', opts)

--Visual Block
keymap("x", "J", ":move '>+1<CR>gv-gv", opts)
keymap("x", "K", ":move '<-2<CR>gv-gv", opts)
keymap("x", "<A-j>", ":move '>+1<CR>gv-gv", opts)
keymap("x", "<A-k>", ":move '<-2<CR>gv-gv", opts)

--Command Mode
keymap("c", "<C-j>", 'pumvisible() ? "\\<C-n>" : "\\<C-j>"', { expr = true, noremap = true, silent = true })
keymap("c", "<C-k>", 'pumvisible() ? "\\<C-p>" : "\\<C-k>"', { expr = true, noremap = true, silent = true })


keymap("x", "il", "^og_", opts)
keymap("o", "il", "<cmd>normal vil<cr>", opts)
keymap("x", "al", "0o$", opts)
keymap("o", "al", "<cmd>normal val<cr>", opts)
