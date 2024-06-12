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
    lazy = true,
  },
  {
    "nvim-tree/nvim-web-devicons",
    lazy = true,
  },
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
  },
  {
    "akinsho/bufferline.nvim",
    lazy = true,
    config = function()
      require("mani.bufferline").setup()
    end,
    event = "VimEnter",
  },
  {
    "SmiteshP/nvim-navic",
    config = function()
      require("mani.navic").setup()
    end,
    lazy = true,
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
  -- {
  --   "akinsho/toggleterm.nvim",
  --   lazy = true,
  --   config = function()
  --     require("mani.toggleterm").setup()
  --   end,
  --   keys = { { "<C-\\>", mode = { "n" } } },
  --   cmd = {
  --     "ToggleTerm",
  --     "TermExec",
  --     "ToggleTermToggleAll",
  --     "ToggleTermSendCurrentLine",
  --     "ToggleTermSendVisualLines",
  --     "ToggleTermSendVisualSelection",
  --   },
  -- },
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
      "FocusMaxOrEqual",
    },
  },
  {
    "goolord/alpha-nvim",
    event = "VimEnter",
    config = function()
      require("mani.alpha").setup()
    end,
    lazy = true,
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
    lazy = true,
  },
  {
    "folke/flash.nvim",
    event = "VeryLazy",
    config = function()
      require("mani.flash-nvim").setup()
    end,
    lazy = true,
  },
  {
    "ThePrimeagen/git-worktree.nvim",
    config = function()
      require("git-worktree").setup()
      require("telescope").load_extension("git_worktree")
    end,
    dependencies = { "telescope.nvim" },
    lazy = true,
  },
  {
    "kylechui/nvim-surround",
    config = function()
      require("nvim-surround").setup({
        keymaps = {
          visual = "gs",
        },
      })
    end,
    event = "User FileOpened",
  },
  {
    "tpope/vim-fugitive",
    lazy = true,
    cmd = { "Git" },
  },
  {
    "tpope/vim-rhubarb",
    lazy = false,
    cmd = { "GBrowse" }
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
    lazy = true,
    dependencies = {
      "rescript-lang/tree-sitter-rescript",
    },
  },
  {
    "JoosepAlviste/nvim-ts-context-commentstring",
    lazy = true,
  },
  {
    "nvim-treesitter/nvim-treesitter-context",
    event = "User FileOpened",
    lazy = true,
  },
  {
    'stevearc/oil.nvim',
    opts = {},
    dependencies = { "nvim-tree/nvim-web-devicons" },
    lazy = true,
    cmd = { "Oil" },
  },

  -- LSP
  {
    "williamboman/mason.nvim",
    config = function()
      require("mani.lsp.mason").setup()
    end,
    cmd = { "Mason", "MasonInstall", "MasonUninstall", "MasonUninstallAll", "MasonLog" },
    lazy = true,
  },
  {
    "williamboman/mason-lspconfig.nvim",
    cmd = { "LspInstall", "LspUninstall", "LspInfo" },
    config = function()
      require("mani.lsp.mason-lspconfig").setup()
    end,
    dependencies = { "mason.nvim" },
    lazy = true,
  },
  {
    "neovim/nvim-lspconfig",
    config = function()
      require("mani.lsp.lspconfig").setup()
      require("mani.lsp.handlers").setup()
    end,
    dependencies = { "williamboman/mason-lspconfig.nvim", "nvim-navic" },
    event = { "BufReadPre", "BufNewFile" },
  },
  {
    "j-hui/fidget.nvim",
    -- tag = "legacy",
    event = "LspAttach",
    config = function()
      require("fidget").setup()
    end,
    lazy = true,
  },
  {
    "https://git.sr.ht/~whynothugo/lsp_lines.nvim",
    event = "LspAttach",
    config = function()
      require("lsp_lines").setup()
    end,
    lazy = true,
  },
  {
    "VidocqH/lsp-lens.nvim",
    event = "LspAttach",
    config = function()
      require("lsp-lens").setup()
    end,
    lazy = true,
  },
  {
    "ray-x/lsp_signature.nvim",
    event = "LspAttach",
    opts = {},
    config = function(_, opts) require('lsp_signature').setup(opts) end
  },

  --Telescope
  {
    "nvim-telescope/telescope.nvim",
    cmd = "Telescope",
    config = function()
      require("mani.telescope").setup()
    end,
    dependencies = {
      "dressing.nvim",
      "telescope-fzf-native.nvim",
    },
    lazy = true,
  },
  {
    "nvim-telescope/telescope-fzf-native.nvim",
    build = "make",
    lazy = true,
  },
  {
    "stevearc/dressing.nvim",
    config = function()
      require("mani.dressing").setup()
    end,
    lazy = true,
    event = "User FileOpened",
  },
  -- {
  --   "ibhagwan/fzf-lua",
  --   dependencies = { "nvim-web-devicons" },
  --   cmd = { "FzfLua" },
  --   config = function()
  --     require("mani.fzf-lua").setup()
  --   end,
  --   lazy = true,
  -- },

  --Rust
  {
    "mrcjkb/rustaceanvim",
    ft = { "rust" },
    opts = require("mani.lsp.settings.rustaceanvim"),
    config = function(_, opts)
      vim.g.rustaceanvim = vim.tbl_deep_extend("force", {}, opts or {})
    end,
    lazy = true,
  },
  {
    "vxpm/ferris.nvim",
    config = function()
      require("ferris").setup()
    end,
    ft = { "rust" },
    lazy = true,
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
    lazy = true,
  },
  {
    "hrsh7th/cmp-path",
    lazy = true,
  },
  {
    "hrsh7th/cmp-cmdline",
    lazy = true,
  },
  {
    "saadparwaiz1/cmp_luasnip",
    lazy = true,
  },
  {
    "hrsh7th/cmp-nvim-lsp",
    lazy = true,
  },
  {
    "rafamadriz/friendly-snippets",
    lazy = true,
  },
  {
    "zbirenbaum/copilot.lua",
    config = function()
      require("mani.copilot").setup()
    end,
    lazy = true,
  },

  --ColorSchemes
  {
    "navarasu/onedark.nvim",
    -- event = "OnedarkStyle",
    config = function()
      require("mani.colorscheme").setup()
    end,
    dependencies = { "cormacrelf/dark-notify" },
  },
  -- {
  --   "ThePrimeagen/harpoon",
  --   branch = "harpoon2",
  --   dependencies = { "nvim-lua/plenary.nvim" },
  --   config = function()
  --     local harpoon = require("harpoon")
  --     harpoon:setup()
  --   end,
  --   lazy = false,
  -- },
  {
    "chentoast/marks.nvim",
    config = function()
      require("marks").setup()
    end,
    event = "User FileOpened",
    lazy = true,
  },
  {
    "topaxi/gh-actions.nvim",
    cmd = "GhActions",
    keys = {
      { "<leader>gh", "<cmd>GhActions<cr>", desc = "Open Github Actions" },
    },
    build = "make",
    dependencies = { "nvim-lua/plenary.nvim", "MunifTanjim/nui.nvim" },
    opts = {},
    config = function(_, opts)
      require("gh-actions").setup(opts)
    end,
  },
  {
    "folke/trouble.nvim",
    tag = "stable",
    opts = {
      -- win = { type = "float", relative = "editor", size = { width = 50, height = 50 }, position = { 0, 0 } },
    }, -- for default options, refer to the configuration section for custom setup.
    cmd = "Trouble",
    keys = {
      {
        "<leader>xx",
        "<cmd>Trouble diagnostics toggle<cr>",
        desc = "Diagnostics (Trouble)",
      },
      {
        "<leader>xX",
        "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
        desc = "Buffer Diagnostics (Trouble)",
      },
      {
        "<leader>cs",
        "<cmd>Trouble symbols toggle focus=false<cr>",
        desc = "Symbols (Trouble)",
      },
      {
        "<leader>cl",
        "<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
        desc = "LSP Definitions / references / ... (Trouble)",
      },
      {
        "<leader>xL",
        "<cmd>Trouble loclist toggle<cr>",
        desc = "Location List (Trouble)",
      },
      {
        "<leader>xQ",
        "<cmd>Trouble qflist toggle<cr>",
        desc = "Quickfix List (Trouble)",
      },
    },
  }
}, {
  ui = { border = "rounded" },
  -- defaults = { lazy = true },
})
