local git_signs = require("gitsigns")
local icons = require("options.icons")

git_signs.setup({
  signs = {
    add = {
      text = icons.ui.BoldLineLeft,
    },
    change = {
      text = icons.ui.BoldLineLeft,
    },
    delete = {
      text = icons.ui.Triangle,
    },
    topdelete = {
      text = icons.ui.Triangle,
    },
    changedelete = {
      text = icons.ui.BoldLineLeft,
    },
  },
  attach_to_untracked = true,
})
