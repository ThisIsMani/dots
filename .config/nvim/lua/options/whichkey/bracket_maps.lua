local which_key = require("which-key")

which_key.add({
  { "]d", vim.diagnostic.goto_next, desc = "Next Diagnostic" },
  { "[d", vim.diagnostic.goto_prev, desc = "Prev Diagnostic" },

  {
    "[e",
    function()
      vim.diagnostic.goto_prev({ severity = vim.diagnostic.severity.ERROR })
    end,
    desc = "Prev Error",
  },
  {
    "]e",
    function()
      vim.diagnostic.goto_next({ severity = vim.diagnostic.severity.ERROR })
    end,
    desc = "Next Error",
  },

  { "[h", "<cmd>Gitsigns prev_hunk<cr>", desc = "Prev Hunk" },
  { "]h", "<cmd>Gitsigns next_hunk<cr>", desc = "Next Hunk" },

  { "[j", "<C-o>", remap = true, desc = "Prev jumplist" },
  { "]j", "<C-i>", remap = true, desc = "Next jumplist" },

  {
    "[q",
    function()
      require("trouble").prev({ mode = "qflist", jump = true })
    end,
    desc = "Prev Quickfix",
  },
  {
    "]q",
    function()
      require("trouble").next({ mode = "qflist", jump = true })
    end,
    desc = "Next Quickfix",
  },

  { "[t", "<cmd>tabprevious<cr>", desc = "Prev Tab" },
  { "]t", "<cmd>tabnext<cr>", desc = "Next Tab" },

  { "[b", "<cmd>bprev<cr>", desc = "Prev Buffer" },
  { "]b", "<cmd>bnext<cr>", desc = "Next Buffer" },
})
