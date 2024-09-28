return {
  "navarasu/onedark.nvim",
  dependencies = {
    "cormacrelf/dark-notify",
    "norcalli/nvim-colorizer.lua",
  },
  event = "VimEnter",
  config = function()
    require("colorizer").setup()
    require("onedark").setup({
      toggle_style_list = { "dark", "light" },
      highlights = {
        Winbar = { bg = "$bg0" },
        WinbarNC = { bg = "$bg0" },
        LspReferenceRead = { bg = "$bg3" },
        LspReferenceWrite = { bg = "$bg3" },
      },
    })

    require("dark_notify").run({
      onchange = function(mode)
        require("onedark").set_options("style", mode)
        require("onedark").load()
      end,
    })
    require("dark_notify").update()
  end,
}
