const injectedComponents = new Set<string>();

export const registerStyles = (componentId: string, css: string): void => {
  if (typeof document === "undefined") return;
  if (injectedComponents.has(componentId)) return;

  const existing = document.head.querySelector(
    `style[data-ui-component="${componentId}"]`,
  );
  if (existing) {
    injectedComponents.add(componentId);
    return;
  }

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-ui-component", componentId);
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
  injectedComponents.add(componentId);
};

export const clearInjectedStyles = (): void => {
  if (typeof document === "undefined") return;
  for (const componentId of injectedComponents) {
    const el = document.head.querySelector(
      `style[data-ui-component="${componentId}"]`,
    );
    el?.remove();
  }
  injectedComponents.clear();
};
