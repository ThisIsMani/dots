local status_ok, fugitive = pcall(require, "fugitive")
if not status_ok then
  return
end

fugitive.setup {}
