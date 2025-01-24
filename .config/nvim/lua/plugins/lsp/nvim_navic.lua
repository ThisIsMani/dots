local get_filename = function()
  local filename = vim.fn.expand("%:t")
  local extension = vim.fn.expand("%:e")

  if not (filename == nil or filename == "") then
    local file_icon, file_icon_color =
      require("nvim-web-devicons").get_icon_color(filename, extension, { default = true })

    local hl_group = "FileIconColor" .. extension
    vim.api.nvim_set_hl(0, hl_group, { fg = file_icon_color })

    return " " .. "%#" .. hl_group .. "#" .. file_icon .. "%*" .. " " .. "%#Winbar#" .. filename .. "%*"
  end
end

GET_LOCATION = function()
  local file = get_filename()
  if file == nil then
    return ""
  end
  local navic = require("nvim-navic").get_location()

  if not (navic == nil or navic == "") then
    navic = " > " .. navic
  end
  return file .. navic
end

vim.o.winbar = "%{%v:lua.GET_LOCATION()%}"

return {
  "SmiteshP/nvim-navic",
  config = function()
    require("nvim-navic").setup({
      lsp = {
        auto_attach = true,
      },
    })
  end,
  event = { "LspAttach" },
  dependencies = {
    "neovim/nvim-lspconfig",
  },
}
