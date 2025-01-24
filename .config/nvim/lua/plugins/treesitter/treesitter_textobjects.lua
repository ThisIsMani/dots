return {
  "nvim-treesitter/nvim-treesitter-textobjects",
  config = function()
    ---@diagnostic disable-next-line: missing-fields
    require("nvim-treesitter.configs").setup({
      textobjects = {
        select = {
          enable = true,
          keymaps = {
            ["af"] = { query = "@function.outer", desc = "Select function outer" },
            ["if"] = { query = "@function.inner", desc = "Select function inner" },
            ["ac"] = { query = "@class.outer", desc = "Select class outer" },
            ["ic"] = { query = "@class.inner", desc = "Select class inner" },
          },
        },
        move = {
          enable = true,
          goto_next_start = {
            ["]f"] = { query = "@function.outer", desc = "Next function start" },
          },
          goto_next_end = {
            ["]F"] = { query = "@function.outer", desc = "Next function end" },
          },
          goto_previous_start = {
            ["[f"] = { query = "@function.outer", desc = "Previous function start" },
          },
          goto_previous_end = {
            ["[F"] = { query = "@function.outer", desc = "Previous function end" },
          },
        },
      },
    })
  end,
  dependencies = {
    "nvim-treesitter/nvim-treesitter",
  },
  event = "VeryLazy",
}
