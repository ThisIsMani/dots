return {
  "nvim-treesitter/nvim-treesitter",
  dependencies = {
    "nvim-treesitter/nvim-treesitter-context",
    { "windwp/nvim-autopairs", dependencies = { "hrsh7th/nvim-cmp" } },
  },
  config = function()
    local npairs = require("nvim-autopairs")
    npairs.setup({
      check_ts = true,
      disable_in_macro = false,
    })

    -- Add new pair
    -- local npairs = require("nvim-autopairs")
    -- local basic = require("nvim-autopairs.rules.basic")
    -- local opt = npairs.config
    -- local bracket = basic.bracket_creator(opt)
    -- npairs.add_rules({
    --   bracket("<", ">"),
    -- })

    local cmp_autopairs = require("nvim-autopairs.completion.cmp")
    local cmp = require("cmp")
    cmp.event:on("confirm_done", cmp_autopairs.on_confirm_done())
  end,
}
