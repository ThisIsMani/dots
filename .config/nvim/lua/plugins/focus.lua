return {
  "nvim-focus/focus.nvim",
  version = "*",
  opts = {
    autoresize = {
      enable = false,
    },
    ui = {
      signcolumn = false,
    },
  },
  cmd = {
    "FocusEnable",
    "FocusDisable",
    "FocusSplitUp",
    "FocusSplitDown",
    "FocusSplitLeft",
    "FocusSplitRight",
  },
  event = "VeryLazy",
}
