return {
  "lukas-reineke/indent-blankline.nvim",
  main = "ibl",
  event = "BufReadPost",
  opts = {
    indent = { char = require("options.icons").ui.LineLeft },
    scope = { enabled = true },
  },
}
