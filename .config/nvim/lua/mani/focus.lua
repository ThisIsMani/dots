local M = {}

function M.setup()
  local focus_status_ok, focus = pcall(require, "focus")
  if not focus_status_ok then
    return
  end

  focus.setup({ autoresize = { enable = false }, ui = { signcolumn = false } })
end

return M
