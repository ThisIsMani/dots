local M = {}

function M.smart_quit()
  local modified = vim.api.nvim_get_option_value("modified", { buf = 0 })
  if modified then
    vim.ui.input({
      prompt = "You have unsaved changes. Quit anyway? (y/n) ",
    }, function(input)
      if input == "y" then
        vim.cmd("q!")
      end
    end)
  else
    vim.cmd("q!")
  end
end

local function delete_buf(kill_command, bufnr, force)
  local bo = vim.bo
  local api = vim.api

  -- Get list of windows IDs with the buffer to close
  local windows = vim.tbl_filter(function(win)
    return api.nvim_win_get_buf(win) == bufnr
  end, api.nvim_list_wins())

  if force then
    kill_command = kill_command .. "!"
  end

  -- Get list of active buffers
  local buffers = vim.tbl_filter(function(buf)
    return api.nvim_buf_is_valid(buf) and bo[buf].buflisted
  end, api.nvim_list_bufs())

  -- If there is only one buffer (which has to be the current one), vim will
  -- create a new buffer on :bd.
  -- For more than one buffer, pick the previous buffer (wrapping around if necessary)
  if #buffers > 1 and #windows > 0 then
    for i, v in ipairs(buffers) do
      if v == bufnr then
        local prev_buf_idx = i == 1 and #buffers or (i - 1)
        local prev_buffer = buffers[prev_buf_idx]
        for _, win in ipairs(windows) do
          api.nvim_win_set_buf(win, prev_buffer)
        end
      end
    end
  end

  -- Check if buffer still exists, to ensure the target buffer wasn't killed
  -- due to options like bufhidden=wipe.
  if api.nvim_buf_is_valid(bufnr) and bo[bufnr].buflisted then
    vim.cmd(string.format("%s %d", kill_command, bufnr))
  end
end

function M.buf_kill(kill_command, bufnr, force)
  kill_command = kill_command or "bd"
  force = force or false

  local bo = vim.bo
  local api = vim.api
  local fmt = string.format
  local fnamemodify = vim.fn.fnamemodify

  if bufnr == 0 or bufnr == nil then
    bufnr = api.nvim_get_current_buf()
  end

  local bufname = api.nvim_buf_get_name(bufnr)

  if not force then
    local warning
    if bo[bufnr].modified then
      warning = fmt([[No write since last change for (%s)]], fnamemodify(bufname, ":t"))
    else
      delete_buf(kill_command, bufnr, false)
      return
    end
    if warning then
      vim.ui.input({
        prompt = string.format([[%s. Close it anyway? (y/n) ]], warning),
      }, function(choice)
        if choice == "y" then
          delete_buf(kill_command, bufnr, true)
        end
      end)
    end
  end
end

M.sources = {
  nvim_lsp = { name = "nvim_lsp", title = "LSP" },
  path = { name = "path", title = "Path" },
  buffer = { name = "buffer", title = "Buffer" },
  treesitter = { name = "treesitter", title = "TreeSitter" },
  nvim_lsp_signature_help = { name = "nvim_lsp_signature_help", title = "Signature Help" },
}

return M
