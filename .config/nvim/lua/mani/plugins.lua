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

-- Use a protected call so we don't error out on first use
local status_ok, lazy = pcall(require, "lazy")
if not status_ok then
  return
end

-- Install your plugins here
lazy.setup({
  {
    "nvim-lua/plenary.nvim",
    cmd = { "PlenaryBustedFile", "PlenaryBustedDirectory" },
    lazy = true
  },
  { "nvim-tree/nvim-web-devicons", lazy = true },
  {
    "nvim-tree/nvim-tree.lua",
    lazy = true,
    config = function()
      require("mani.nvim-tree").setup()
    end,
    event = "User DirOpened",
    cmd = { "NvimTreeToggle", "NvimTreeOpen", "NvimTreeFocus", "NvimTreeFindFileToggle" },
  },
  {
    "RRethy/vim-illuminate",
    lazy = true,
    config = function()
      require("mani.illuminate").setup()
    end,
    event = "User FileOpened",
  },
  {
    "folke/which-key.nvim",
    lazy = true,
    config = function()
      require("mani.whichkey").setup()
    end,
    cmd = "WhichKey",
    event = "VeryLazy",
  },
  {
    "numToStr/Comment.nvim",
    lazy = true,
    config = function()
      require("mani.comment").setup()
    end,
    keys = { { "gc", mode = { "n", "v" } }, { "gb", mode = { "n", "v" } } },
    event = "User FileOpened",
  },
  {
    "akinsho/bufferline.nvim",
    lazy = true,
    config = function()
      require("mani.bufferline").setup()
    end,
    event = "VimEnter"
  },
  {
    "SmiteshP/nvim-navic",
    lazy = true,
    config = function()
      require("mani.breadcrumbs").setup()
    end,
    event = "User FileOpened",
  },
  {
    "lukas-reineke/indent-blankline.nvim",
    lazy = true,
    config = function()
      require("mani.indentlines").setup()
    end,
    event = "User FileOpened",
  },
  {
    "nvim-lualine/lualine.nvim",
    lazy = true,
    config = function()
      require("mani.lualine").setup()
    end,
    event = "VimEnter",
  },
  {
    "lewis6991/gitsigns.nvim",
    lazy = true,
    config = function()
      require("mani.gitsigns").setup()
    end,
    event = "User FileOpened",
  },
  {
    "akinsho/toggleterm.nvim",
    lazy = true,
    config = function()
      require("mani.toggleterm").setup()
    end,
    keys = { { "<C-\\>", mode = { "n" } } },
    cmd = {
      "ToggleTerm",
      "TermExec",
      "ToggleTermToggleAll",
      "ToggleTermSendCurrentLine",
      "ToggleTermSendVisualLines",
      "ToggleTermSendVisualSelection",
    },
  },
  {
    "windwp/nvim-autopairs",
    lazy = true,
    config = function()
      require("mani.autopairs").setup()
    end,
    event = "InsertEnter",
    dependencies = { "nvim-treesitter/nvim-treesitter", "hrsh7th/nvim-cmp" },
  },
  {
    "beauwilliams/focus.nvim",
    lazy = true,
    config = function()
      require("mani.focus").setup()
    end,
    cmd = {
      "FocusDisable",
      "FocusEnable",
      "FocusToggle",
      "FocusSplitNicely",
      "FocusSplitCycle",
      "FocusDisableWindow",
      "FocusEnableWindow",
      "FocusToggleWindow",
      "FocusGetDisabledWindows",
      "FocusSplitLeft",
      "FocusSplitDown",
      "FocusSplitUp",
      "FocusSplitRight",
      "FocusEqualise",
      "FocusMaximise",
      "FocusMaxOrEqual"
    }
  },
  {
    "goolord/alpha-nvim",
    event = "VimEnter",
    config = function()
      require("mani.alpha").setup()
    end,
    lazy = true
  },
  -- "projekt0n/github-nvim-theme",
  {
    "folke/zen-mode.nvim",
    config = function()
      require("mani.zen_mode").setup()
    end,
    cmd = {
      "ZenMode",
    },
    lazy = true
  },
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    config = function()
      require("mani.flash-nvim").setup()
    end,
    lazy = true
  },
  {
    "ThePrimeagen/git-worktree.nvim",
    config = function()
      require("git-worktree").setup()
      require("telescope").load_extension("git_worktree")
    end,
    dependencies = { "telescope.nvim" },
    lazy = true
  },
  {
    "kylechui/nvim-surround",
    config = function()
      require("nvim-surround").setup({
        keymaps = {
          visual = "gs"
        }
      })
    end,
    lazy = false
  },
  {
    "tpope/vim-fugitive"
  },
  {
    "tpope/vim-rhubarb"
  },

  --Treesitter
  {
    "nvim-treesitter/nvim-treesitter",
    config = function()
      require("mani.treesitter").setup()
    end,
    cmd = {
      "TSInstall",
      "TSUninstall",
      "TSUpdate",
      "TSUpdateSync",
      "TSInstallInfo",
      "TSInstallSync",
      "TSInstallFromGrammar",
    },
    event = "User FileOpened",
    lazy = true
  },
  {
    "JoosepAlviste/nvim-ts-context-commentstring",
    lazy = true
  },
  {
    "nvim-treesitter/nvim-treesitter-context",
    event = "User FileOpened",
    lazy = true
  },

  --LSP
  {
    "williamboman/mason.nvim",
    config = function()
      require("mani.lsp.mason").setup()
      require("mani.lsp.handlers").setup()
    end,
    cmd = { "Mason", "MasonInstall", "MasonUninstall", "MasonUninstallAll", "MasonLog" },
    event = "User FileOpened",
    lazy = true,
  },
  {
    "williamboman/mason-lspconfig.nvim",
    cmd = { "LspInstall", "LspUninstall" },
    config = function()
      require("mani.lsp.mason-lspconfig").setup()
    end,
    lazy = true,
    event = "User FileOpened",
  },
  {
    "neovim/nvim-lspconfig",
    lazy = true,
    config = function()
      require("mani.lsp.lspconfig").setup()
    end,
    dependencies = { --[[ "nlsp-settings.nvim",  ]] "mason.nvim", "mason-lspconfig.nvim" },
  },
  {
    "jose-elias-alvarez/null-ls.nvim",
    config = function()
      require("mani.lsp.null-ls").setup()
    end,
    lazy = true
  },
  {
    "j-hui/fidget.nvim",
    -- tag = "legacy",
    event = "LspAttach",
    config = function()
      require("fidget").setup()
    end,
    lazy = true
  },
  {
    "https://git.sr.ht/~whynothugo/lsp_lines.nvim",
    event = "LspAttach",
    config = function()
      require("lsp_lines").setup()
    end,
    lazy = true
  },
  {
    "VidocqH/lsp-lens.nvim",
    event = "LspAttach",
    config = function()
      require("lsp-lens").setup()
    end,
    lazy = true
  },

  --Telescope
  {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    config = function()
      require("mani.telescope").setup()
    end,
    dependencies = "dressing.nvim",
    lazy = false
  },
  -- "ahmedkhalf/project.nvim",
  {
    "stevearc/dressing.nvim",
    config = function()
      require("mani.dressing").setup()
    end,
    event = "LspAttach",
    lazy = true,
  },

  --Rust
  {
    "mrcjkb/rustaceanvim",
    lazy = true,
    ft = { "rust" },
    opts = require("mani.lsp.settings.rustaceanvim"),
    config = function(_, opts)
      vim.g.rustaceanvim = vim.tbl_deep_extend("force", {}, opts or {})
    end
  },

  --CMP
  {
    "hrsh7th/nvim-cmp",
    event = { "InsertEnter", "CmdlineEnter" },
    config = function()
      require("mani.completion").setup()
    end,
    dependencies = {
      "cmp-nvim-lsp",
      "cmp_luasnip",
      "cmp-buffer",
      "cmp-path",
      "cmp-cmdline",
      "copilot.lua",
      -- "copilot-cmp",
    },
    lazy = true,
  },
  {
    "L3MON4D3/LuaSnip",
    lazy = true,
    dependencies = { "rafamadriz/friendly-snippets" },
  },
  {
    "hrsh7th/cmp-buffer",
    lazy = true
  },
  {
    "hrsh7th/cmp-path",
    lazy = true
  },
  {
    "hrsh7th/cmp-cmdline",
    lazy = true
  },
  {
    "saadparwaiz1/cmp_luasnip",
    lazy = true
  },
  {
    "hrsh7th/cmp-nvim-lsp",
    lazy = true
  },
  {
    "rafamadriz/friendly-snippets",
    lazy = true
  },
  {
    "zbirenbaum/copilot.lua",
    config = function()
      require("mani.copilot").setup()
    end,
    lazy = true
  },
  -- {
  --   "zbirenbaum/copilot-cmp",
  --   config = function()
  --     require("copilot_cmp").setup()
  --   end,
  --   lazy = true
  -- },
  -- "zbirenbaum/copilot.lua",
  -- "zbirenbaum/copilot-cmp",
  -- "jcdickinson/codeium.nvim",

  --ColorSchemes
  {
    "navarasu/onedark.nvim",
    -- event = "OnedarkStyle",
    config = function()
      require("mani.colorscheme").setup()
    end,
    lazy = false,
  },
  {
    "vimpostor/vim-lumen",
    lazy = false,
  },
}, {
  ui = { border = "rounded" },
  -- defaults = { lazy = true },
})
