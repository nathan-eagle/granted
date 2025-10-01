export function renderTemplate(tpl: string, vars: Record<string,string|number|undefined>) {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (_, k) => {
    const v = vars[k]
    return (v === undefined || v === null) ? "" : String(v)
  })
}
