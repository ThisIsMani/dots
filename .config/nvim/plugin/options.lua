local options = {
  clipboard = "unnamedplus",               -- allows neovim to access the system clipboard
  -- cmdheight = 1,                           -- more space in the neovim command line for displaying messages
  -- completeopt = { "menuone", "noselect" }, -- mostly just for cmp
  -- conceallevel = 0,                        -- so that `` is visible in markdown files
  -- fileencoding = "utf-8",                  -- the encoding written to a file
  foldmethod = "expr",                     -- folding, set to "expr" for treesitter based folding
  foldexpr = "nvim_treesitter#foldexpr()", -- set to "nvim_treesitter#foldexpr()" for treesitter based folding
  foldenable = false,
  foldlevel = 20,

  inccommand = "split",
  -- guifont = "monospace:h17",               -- the font used in graphical neovim applications
  -- hlsearch = true,        -- highlight all matches on previous search pattern
  -- hidden = true,          -- required to keep multiple buffers and open multiple buffers
  ignorecase = true,      -- ignore case in search patterns
  -- mouse = "a",            -- allow the mouse to be used in neovim
  -- pumheight = 10,         -- pop up menu height
  -- showmode = false,       -- we don't need to see things like -- INSERT -- anymore
  -- showtabline = 2,        -- always show tabs
  smartcase = true,       -- smart case
  smartindent = true,     -- make indenting smarter again
  -- splitbelow = true,      -- force all horizontal splits to go below current window
  -- splitright = true,      -- force all vertical splits to go to the right of current window
  -- swapfile = false,       -- creates a swapfile
  termguicolors = true,   -- set term gui colors (most terminals support this)
  timeoutlen = 300,       -- time to wait for a mapped sequence to complete (in milliseconds)
  -- title = true,           -- set the title of window to the value of the titlestring
  undofile = true,        -- enable persistent undo
  -- updatetime = 100,       -- faster completion (4000ms default)
  -- writebackup = false,    -- if a file is being edited by another program (or was written to file while editing with another program), it is not allowed to be edited
  expandtab = true,       -- convert tabs to spaces
  shiftwidth = 2,         -- the number of spaces inserted for each indentation
  tabstop = 4,            -- insert 4 spaces for a tab
  cursorline = true,      -- highlight the current line
  number = true,          -- set numbered lines
  relativenumber = true, -- set relative numbered lines
  -- numberwidth = 4,        -- set number column width to 4
  signcolumn = "yes",     -- always show the sign column, otherwise it would shift the text each time
  wrap = false,           -- display lines as one long line
  linebreak = true,       -- companion to wrap, don't split words
  scrolloff = 8,          -- minimal number of screen lines to keep above and below the cursor
  sidescrolloff = 8,      -- minimal number of screen columns either side of cursor if wrap is `false`
  -- whichwrap = "bs<>[]hl", -- which "horizontal" keys are allowed to travel to prev/next line
  -- showcmd = false,
  -- ruler = false,
  -- laststatus = 3,
}

for k, v in pairs(options) do
  vim.opt[k] = v
end

-- ---  SETTINGS  ---
-- vim.opt.spelllang:append "cjk" -- disable spellchecking for asian characters (VIM algorithm does not support it)
-- vim.opt.shortmess:append "c"   -- don't show redundant messages from ins-completion-menu
-- vim.opt.shortmess:append "I"   -- don't show the default intro message
-- vim.opt.whichwrap:append "<,>,[,],h,l"

-- vim.opt.shortmess = "" -- try to prevent echom from cutting messages off or prompting
-- vim.opt.more = false -- don't pause listing when screen is filled
-- vim.opt.cmdheight = 9999 -- helps avoiding |hit-enter| prompts.
-- vim.opt.columns = 9999 -- set the widest screen possible
-- vim.opt.swapfile = false -- don't use a swap file

-- vim.g.loaded_netrw = 1
-- vim.g.loaded_netrwPlugin = 1
--
-- vim.g.loaded_netrw = 1
-- vim.g.loaded_netrwPlugin = 1
-- if vim.g.neovide then
--   vim.opt.guifont = "JetBrainsMono Nerd Font Mono:h15"
--   vim.g.neovide_fullscreen = true
--   vim.g.neovide_cursor_vfx_mode = "torpedo"
-- end
--
