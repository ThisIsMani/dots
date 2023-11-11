local M = {}

function M.setup()
  local status_ok, mason = pcall(require, "mason")
  if not status_ok then
    return
  end

  local settings = {
    ui = {
      border = "rounded",
      keymaps = {
        toggle_package_expand = "<CR>",
        install_package = "i",
        update_package = "u",
        check_package_version = "c",
        update_all_packages = "U",
        check_outdated_packages = "C",
        uninstall_package = "X",
        cancel_installation = "<C-c>",
        apply_language_filter = "<C-f>",
      },
    },
  }

  mason.setup(settings)
end

return M
