export const requiredElement = <T extends HTMLElement>(id: string, expected: { new (): T }): T => {
  const element = document.getElementById(id)
  if (!(element instanceof expected)) {
    throw new Error(`Required ${expected.name} #${id} not found`)
  }
  return element
}

export const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
