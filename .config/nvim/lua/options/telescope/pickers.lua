local ts_select_dir_for_grep = function(prompt_bufnr)
  local action_state = require("telescope.actions.state")
  local fb = require("telescope").extensions.file_browser
  local live_grep = require("telescope.builtin").live_grep
  local current_line = action_state.get_current_line()

  fb.file_browser({
    files = false,
    depth = false,
    attach_mappings = function(prompt_bufnr)
      require("telescope.actions").select_default:replace(function()
        local entry_path = action_state.get_selected_entry().Path
        local dir = entry_path:is_dir() and entry_path or entry_path:parent()
        local relative = dir:make_relative(vim.fn.getcwd())
        local absolute = dir:absolute()

        live_grep({
          results_title = relative .. "/",
          cwd = absolute,
          default_text = current_line,
        })
      end)

      return true
    end,
  })
end

return function(actions)
  return {
    find_files = {
      theme = "dropdown",
      previewer = false,
    },
    live_grep = {
      only_sort_text = true,
      mappings = {
        i = {
          ["<C-f>"] = ts_select_dir_for_grep,
        },
        n = {
          ["<C-f>"] = ts_select_dir_for_grep,
        },
      },
    },
    grep_string = {
      only_sort_text = true,
    },
    buffers = {
      theme = "dropdown",
      previewer = false,
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
    lsp_document_symbols = {
      theme = "dropdown",
      initial_mode = "normal",
      previewer = true,
    },
  }
end
