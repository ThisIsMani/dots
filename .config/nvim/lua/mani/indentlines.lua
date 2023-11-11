local M = {}
function M.setup()
  local status_ok, indent_blankline = pcall(require, "ibl")
  if not status_ok then
    return
  end

  -- local colors = require('onedark.colors')

  -- local highlights = {
  --   "IblIndent"
  -- }

  -- local hooks = require "ibl.hooks"
  -- -- create the highlight groups in the highlight setup hook, so they are reset
  -- -- every time the colorscheme changes
  -- hooks.register(hooks.type.HIGHLIGHT_SETUP, function()
  --     vim.api.nvim_set_hl(0, "IblIndent", { fg = colors.fg1 })
  -- end)

  indent_blankline.setup({
    indent = { char = require('mani.icons').ui.LineLeft, --[[ highlight = highlights ]] },
    scope = { enabled = true }
  })

  -- hooks.register(hooks.type.SCOPE_HIGHLIGHT, hooks.builtin.scope_highlight_from_extmark)
end

return M
