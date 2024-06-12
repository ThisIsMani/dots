local which_key = require("which-key")

local gopts = {
  mode = "n",     -- NORMAL mode
  prefix = "g",
  buffer = nil,   -- Global mappings. Specify a buffer number for buffer local mappings
  silent = true,  -- use `silent` when creating keymaps
  noremap = true, -- use `noremap` when creating keymaps
  nowait = true,  -- use `nowait` when creating keymaps
}

local gmappings = {
  j = { "<cmd>Telescope jumplist<cr>", "Open Jump List" }
}

which_key.register(gmappings, gopts)
