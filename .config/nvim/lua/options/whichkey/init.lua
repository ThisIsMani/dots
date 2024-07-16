local which_key = require("which-key")
local icons = require("options.icons")

which_key.setup({
  icons = {
    breadcrumb = icons.ui.DoubleChevronRight, -- symbol used in the command line area that shows your active key combo
    separator = icons.ui.BoldArrowRight, -- symbol used between a key and it's label
    group = icons.ui.Plus, -- symbol prepended to a group
  },
  popup_mappings = {
    scroll_down = "Tab", -- binding to scroll down inside the popup
    scroll_up = "<S-Tab>", -- binding to scroll up inside the popup
  },
  window = {
    border = "single", -- none, single, double, shadow
  },
})

require("options.whichkey.visual_maps")

require("options.whichkey.leader_maps")

require("options.whichkey.g_maps")
