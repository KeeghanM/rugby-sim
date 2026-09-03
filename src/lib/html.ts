const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

export const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (character) => ESCAPES[character] ?? character)
