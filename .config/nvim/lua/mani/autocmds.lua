local uv = vim.loop

local function is_directory(path)
  local stat = uv.fs_stat(path)
  return stat and stat.type == "directory" or false
end

local definitions = {
  { -- taken from AstroNvim
    "BufEnter",
    {
      group = "_dir_opened",
      nested = true,
      callback = function(args)
        local bufname = vim.api.nvim_buf_get_name(args.buf)
        if is_directory(bufname) then
          vim.api.nvim_del_augroup_by_name "_dir_opened"
          vim.cmd "do User DirOpened"
          vim.api.nvim_exec_autocmds(args.event, { buffer = args.buf, data = args.data })
        end
      end,
    },
  },
  { -- taken from AstroNvim
    { "BufRead", "BufWinEnter", "BufNewFile" },
    {
      group = "_file_opened",
      nested = true,
      callback = function(args)
        local buftype = vim.api.nvim_get_option_value("buftype", { buf = args.buf })
        if not (vim.fn.expand "%" == ""
              or buftype == "nofile"
              or is_directory(vim.api.nvim_buf_get_name(args.buf))) then
          vim.api.nvim_del_augroup_by_name "_file_opened"
          vim.api.nvim_exec_autocmds("User", { pattern = "FileOpened" })
        end
      end,
    },
  },
}

for _, entry in ipairs(definitions) do
  local event = entry[1]
  local opts = entry[2]
  if type(opts.group) == "string" and opts.group ~= "" then
    local exists, _ = pcall(vim.api.nvim_get_autocmds, { group = opts.group })
    if not exists then
      vim.api.nvim_create_augroup(opts.group, {})
    end
  end
  vim.api.nvim_create_autocmd(event, opts)
end
