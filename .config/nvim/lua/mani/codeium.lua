local codeium_status_ok, codeium = pcall(require, "codeium")
if not codeium_status_ok then
  return
end

codeium.setup({})
