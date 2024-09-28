local which_key = require("which-key")
local icons = require("options.icons")

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
