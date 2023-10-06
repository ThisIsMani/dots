local fn = vim.fn

-- Automatically install lazynvim
local lazypath = fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- -- Autocommand that reloads neovim whenever you save the plugins.lua file
-- vim.cmd([[
--   augroup packer_user_config
--     autocmd!
--     autocmd BufWritePost plugins.lua source <afile> | PackerSync
--   augroup end
-- ]])

-- Use a protected call so we don't error out on first use
local status_ok, lazy = pcall(require, "lazy")
if not status_ok then
  return
end

-- Have packer use a popup window
-- lazy.init({
--   display = {
--     open_fn = function()
--       return require("packer.util").float({ border = "rounded" })
--     end,
--   },
-- })

-- Install your plugins here
lazy.setup({
  "nvim-lua/plenary.nvim", -- Useful lua functions used by lots of plugins
  "nvim-tree/nvim-web-devicons",
  "nvim-tree/nvim-tree.lua",
  "RRethy/vim-illuminate",
  "folke/which-key.nvim",
  "numToStr/Comment.nvim",
  "akinsho/bufferline.nvim",
  "SmiteshP/nvim-navic",
  "lukas-reineke/indent-blankline.nvim",
  "nvim-lualine/lualine.nvim",
  "lewis6991/gitsigns.nvim",
  "lewis6991/impatient.nvim",
  "akinsho/toggleterm.nvim",
  "windwp/nvim-autopairs",
  { "catppuccin/nvim",  name = "catppuccin" },
  "ellisonleao/gruvbox.nvim",
  { "rose-pine/neovim", name = "rose-pine" },
  "beauwilliams/focus.nvim",
  "rmagatti/goto-preview",
  "goolord/alpha-nvim",
  "projekt0n/github-nvim-theme",
  "EdenEast/nightfox.nvim",
  -- use({ "tpope/vim-fugitive" })
  "sindrets/diffview.nvim",
  "folke/zen-mode.nvim",
  "folke/flash.nvim",

  --Treesitter
  "nvim-treesitter/nvim-treesitter",
  "JoosepAlviste/nvim-ts-context-commentstring",
  "nvim-treesitter/nvim-treesitter-context",

  --LSP
  "williamboman/mason.nvim",
  "williamboman/mason-lspconfig.nvim",
  "neovim/nvim-lspconfig",
  "tamago324/nlsp-settings.nvim",
  "jose-elias-alvarez/null-ls.nvim",
  "jay-babu/mason-null-ls.nvim",
  { "j-hui/fidget.nvim", tag = "legacy" },
  "https://git.sr.ht/~whynothugo/lsp_lines.nvim",
  "VidocqH/lsp-lens.nvim",

  --Telescope
  "nvim-telescope/telescope.nvim",
  "ahmedkhalf/project.nvim",
  "stevearc/dressing.nvim",

  --Rust
  "simrat39/rust-tools.nvim",

  --CMP
  "hrsh7th/nvim-cmp",
  "L3MON4D3/LuaSnip",
  "hrsh7th/cmp-buffer",
  "hrsh7th/cmp-path",
  "hrsh7th/cmp-cmdline",
  "saadparwaiz1/cmp_luasnip",
  "hrsh7th/cmp-nvim-lsp",
  "rafamadriz/friendly-snippets",
  "zbirenbaum/copilot.lua",
  "zbirenbaum/copilot-cmp",
  "jcdickinson/codeium.nvim",

  --ColorSchemes
  "navarasu/onedark.nvim",
  "vimpostor/vim-lumen",
})
