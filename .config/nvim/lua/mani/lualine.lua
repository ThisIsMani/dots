local M = {}

function M.setup()
  local status_ok, lualine = pcall(require, "lualine")
  if not status_ok then
    return
  end

  local function diff_source()
    local gitsigns = vim.b.gitsigns_status_dict
    if gitsigns then
      return {
        added = gitsigns.added,
        modified = gitsigns.changed,
        removed = gitsigns.removed,
      }
    end
  end

  local icons = require('mani.icons')
  local components = {
    mode = {
      "mode",
      fmt = function(str)
        return " " .. str .. " "
      end,
      padding = { left = 1, right = 0 },
      seperator = { left = '' },
      color = {},
      cond = nil,
    },
    branch = {
      "b:gitsigns_head",
      icon = icons.git.Branch,
      color = { gui = "bold" },
    },
    diff = {
      "diff",
      source = diff_source,
      symbols = {
        added = icons.git.LineAdded .. " ",
        modified = icons.git.LineModified .. " ",
        removed = icons.git.LineRemoved .. " ",
      },
    },
    diagnostics = {
      "diagnostics",
      sources = { "nvim_diagnostic" },
      symbols = {
        error = icons.diagnostics.BoldError .. " ",
        warn = icons.diagnostics.BoldWarning .. " ",
        info = icons.diagnostics.BoldInformation .. " ",
        hint = icons.diagnostics.BoldHint .. " ",
      },
      -- cond = conditions.hide_in_width,
    },
    lsp = {
      function(msg)
        msg = msg or "LS Inactive"
        local buf_clients = vim.lsp.buf_get_clients()
        if next(buf_clients) == nil then
          -- TODO: clean up this if statement
          if type(msg) == "boolean" or #msg == 0 then
            return "LS Inactive"
          end
          return msg
        end
        local buf_ft = vim.bo.filetype
        local buf_client_names = {}

        -- add client
        for _, client in pairs(buf_clients) do
          if client.name ~= "null-ls" then
            table.insert(buf_client_names, client.name)
          end
        end

        -- add formatter
        -- local formatters = require "lvim.lsp.null-ls.formatters"
        -- local supported_formatters = formatters.list_registered(buf_ft)
        -- vim.list_extend(buf_client_names, supported_formatters)
        --
        -- add linter
        -- local linters = require "lvim.lsp.null-ls.linters"
        -- local supported_linters = linters.list_registered(buf_ft)
        -- vim.list_extend(buf_client_names, supported_linters)

        local unique_client_names = vim.fn.uniq(buf_client_names)

        local language_servers = "[" .. table.concat(unique_client_names, ", ") .. "]"

        return language_servers
      end,
      color = { gui = "bold" },
      -- cond = vim.o.columns > 100,
    },
    spaces = {
      function()
        local shiftwidth = vim.api.nvim_buf_get_option(0, "shiftwidth")
        return icons.ui.Tab .. " " .. shiftwidth
      end,
      padding = 1,
    },
    filetype = { "filetype", cond = nil, padding = { left = 1, right = 1 } },
    location = { "location" },
    progress = {
      "progress",
      fmt = function()
        return "%P/%L"
      end,
      color = {},
      padding = { left = 1, right = 2 },
      seperator = { left = '' },
    },
  }

  lualine.setup({
    options = {
      theme = "auto",
      globalstatus = true,
      icons_enabled = true,
      component_separators = { left = "|", right = "|" },
      section_separators = { left = "", right = "" },
      disabled_filetypes = { "alpha" },
    },
    sections = {
      lualine_a = {
        components.mode,
      },
      lualine_b = {
        components.branch,
      },
      lualine_c = {
        components.diff,
      },
      lualine_x = {
        components.diagnostics,
        components.lsp,
        components.spaces,
        components.filetype,
      },
      lualine_y = { components.location },
      lualine_z = {
        components.progress,
      },
    },
    inactive_sections = {
      lualine_a = {},
      lualine_b = {},
      lualine_c = { "filename" },
      lualine_x = { "location" },
      lualine_y = {},
      lualine_z = {},
    },
    tabline = {},
    extensions = {},
  })
end

return M
