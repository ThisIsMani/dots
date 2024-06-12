local which_key = require("which-key")

local vopts = {
  mode = "v",     -- VISUAL mode
  prefix = "<leader>",
  buffer = nil,   -- Global mappings. Specify a buffer number for buffer local mappings
  silent = true,  -- use `silent` when creating keymaps
  noremap = true, -- use `noremap` when creating keymaps
  nowait = true,  -- use `nowait` when creating keymaps
}

local vmappings = {
  ["/"] = { "<Plug>(comment_toggle_linewise_visual)", "Comment toggle" },
}

which_key.register(vmappings, vopts)
