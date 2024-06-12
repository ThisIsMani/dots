local preview_status_ok, preview = pcall(require, "goto-preview")
if not preview_status_ok then
  return
end

preview.setup({ default_mappings = true })
