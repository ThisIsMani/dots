local which_key = require("which-key")

which_key.setup({
  icons = {
    mappings = false,
  },
  win = {
    border = "single",
  },
})

require("options.whichkey.leader_maps")
require("options.whichkey.bracket_maps")
