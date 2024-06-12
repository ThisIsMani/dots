local M = {}

local uv = vim.loop

function M.smart_quit()
  local bufnr = vim.api.nvim_get_current_buf()
  local modified = vim.api.nvim_buf_get_option(bufnr, "modified")
  if modified then
    vim.ui.input({
      prompt = "You have unsaved changes. Quit anyway? (y/n) ",
    }, function(input)
      if input == "y" then
        vim.cmd "q!"
      end
    end)
  else
    vim.cmd "q!"
  end
end

function M.isempty(s)
  return s == nil or s == ""
end

function M.get_buf_option(opt)
  local status_ok, buf_option = pcall(vim.api.nvim_buf_get_option, 0, opt)
  if not status_ok then
    return nil
  else
    return buf_option
  end
end

function M.is_directory(path)
  local stat = uv.fs_stat(path)
  return stat and stat.type == "directory" or false
end

function M.buf_kill(kill_command, bufnr, force)
  kill_command = kill_command or "bd"

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
    elseif api.nvim_buf_get_option(bufnr, "buftype") == "terminal" then
      warning = fmt([[Terminal %s will be killed]], bufname)
    end
    if warning then
      vim.ui.input({
        prompt = string.format([[%s. Close it anyway? [y]es or [n]o (default: no): ]], warning),
      }, function(choice)
        if choice:match "ye?s?" then force = true end
      end)
      if not force then return end
    end
  end

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

M.get_pickers = function(actions)
  return {
    find_files = {
      theme = "dropdown",
      previewer = false,
    },
    live_grep = {
      only_sort_text = true,
    },
    grep_string = {
      only_sort_text = true,
    },
    buffers = {
      theme = "dropdown",
      previewer = false,
      initial_mode = "normal",
      mappings = {
        i = {
          ["<C-d>"] = actions.delete_buffer,
        },
        n = {
          ["dd"] = actions.delete_buffer,
        },
      },
    },
    planets = {
      show_pluto = true,
      show_moon = true,
    },
    git_files = {
      theme = "dropdown",
      hidden = true,
      previewer = false,
      show_untracked = true,
    },
    lsp_references = {
      initial_mode = "normal",
    },
    lsp_definitions = {
      initial_mode = "normal",
    },
    lsp_declarations = {
      initial_mode = "normal",
    },
    lsp_implementations = {
      initial_mode = "normal",
    },
    lsp_incoming_calls = {
      initial_mode = "normal",
    },
    lsp_outgoing_calls = {
      initial_mode = "normal",
    },
  }
end

function M.find_project_files(opts)
  local _, builtin = pcall(require, "telescope.builtin")
  opts = opts or {}
  local ok = pcall(builtin.git_files, opts)

  if not ok then
    builtin.find_files(opts)
  end
end

M.hop_functions = {}
M.hop_functions.find_next = function()
  local status_ok, hop = pcall(require, "hop")
  if not status_ok then
    return nil
  else
    hop.hint_char2({
      direction = require 'hop.hint'.HintDirection.AFTER_CURSOR,
    })
  end
end

M.hop_functions.find_prev = function()
  local status_ok, hop = pcall(require, "hop")
  if not status_ok then
    return nil
  else
    hop.hint_char2({
      direction = require 'hop.hint'.HintDirection.BEFORE_CURSOR,
    })
  end
end

M.hop_functions.goto_next = function()
  local status_ok, hop = pcall(require, "hop")
  if not status_ok then
    return nil
  else
    hop.hint_char2({
      direction = require 'hop.hint'.HintDirection.AFTER_CURSOR,
      hint_offset = -1
    })
  end
end

M.hop_functions.goto_prev = function()
  local status_ok, hop = pcall(require, "hop")
  if not status_ok then
    return nil
  else
    hop.hint_char2({
      direction = require 'hop.hint'.HintDirection.BEFORE_CURSOR,
      hint_offset = -1
    })
  end
end

return M
