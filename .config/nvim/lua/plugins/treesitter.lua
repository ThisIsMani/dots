return {
  "nvim-treesitter/nvim-treesitter",
  dependencies = {
    "nvim-treesitter/nvim-treesitter-context",
    { "windwp/nvim-autopairs", dependencies = { "hrsh7th/nvim-cmp" } },
  },
  config = function()
    local npairs = require("nvim-autopairs")
    local Rule = require("nvim-autopairs.rule")
    npairs.setup({
      check_ts = true,
      disable_in_macro = false,
    })
    local basic = require("nvim-autopairs.rules.basic")
    -- local utils = require("nvim-autopairs.utils")
    -- local original_is_close_bracket = utils.is_close_bracket
    -- function utils.is_close_bracket(char)
    --   return original_is_close_bracket(char) or char == ">"
    -- end

    local opt = require("nvim-autopairs").config
    local bracket = basic.bracket_creator(opt)

    npairs.add_rules({
      bracket("<", ">"),
    })
    local cmp_autopairs = require("nvim-autopairs.completion.cmp")
    local cmp = require("cmp")
    cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
  end,
}
