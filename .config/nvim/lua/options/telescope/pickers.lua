return function (actions)
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
