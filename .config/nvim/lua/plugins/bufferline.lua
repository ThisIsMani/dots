return {
  "akinsho/bufferline.nvim",
  version = "*",
  config = function()
    require("bufferline").setup({
      options = {
        diagnostics = "nvim_lsp",
        diagnostics_indicator = function(_, _, diagnostics_dict, _)
          local res = " "
          for type, count in pairs(diagnostics_dict) do
            local sym = type == "error" and " " or (type == "warning" and " " or " ")
            res = res .. sym .. count .. " "
          end
          return res
        end,
      },
    })
  end,
  event = "VimEnter",
}
