import { escapeHtml } from "../html.ts";
import { registerStyles } from "./styles.ts";

const BASE_UI_STYLES = `
  .ui-tile, .career-metric {
    background: linear-gradient(180deg, rgb(15 23 42 / 88%) 0%, rgb(30 41 59 / 75%) 100%);
    border: 1px solid rgb(255 255 255 / 12%);
    border-radius: 0.65rem;
    padding: clamp(1.2rem, 2.5vw, 2rem);
    box-shadow: 0 6px 20px rgb(0 0 0 / 35%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .ui-tile-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .ui-tile-kicker, .career-kicker {
    color: #38bdf8;
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .ui-tile-value-row {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  .ui-tile-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: clamp(1.6rem, 3.2vw, 2.2rem);
    font-weight: 800;
    color: #f8fafc;
  }
  .ui-modal-backdrop, .career-modal-backdrop {
    position: fixed;
    z-index: 120;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }
  .ui-modal-dialog, .career-modal-dialog {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    border: 1px solid rgb(255 255 255 / 18%);
    border-radius: 0.75rem;
    box-shadow: 0 20px 45px rgb(0 0 0 / 70%);
    width: 100%;
    max-width: 780px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #f8fafc;
  }
  .ui-modal-header, .career-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgb(255 255 255 / 12%);
    background: rgba(0, 0, 0, 0.3);
  }
  .ui-modal-close, .career-modal-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.3rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
    line-height: 1;
    transition: color 0.15s, background 0.15s;
  }
  .ui-modal-close:hover, .career-modal-close:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }
  .ui-modal-body, .career-modal-body {
    padding: 1.15rem;
    overflow-y: auto;
  }
`;

registerStyles("ui-base", BASE_UI_STYLES);

export interface TileAction {
  label: string;
  datasetAttr?: string;
  className?: string;
  style?: string;
}

export interface TileOptions {
  kicker?: string;
  title?: string;
  action?: TileAction | string;
  value?: string | number;
  valueColor?: string;
  valueBadge?: { text: string; color?: string; style?: string };
  subtitle?: string;
  content?: string;
  footer?: string;
  className?: string;
  style?: string;
  customHeader?: string;
  datasetAttr?: string;
}

export const createTile = (options: TileOptions): string => {
  const {
    kicker,
    title,
    action,
    value,
    valueColor,
    valueBadge,
    subtitle,
    content,
    footer,
    className = "",
    style = "",
    customHeader,
    datasetAttr = "",
  } = options;

  let actionHtml = "";
  if (typeof action === "string") {
    actionHtml = action;
  } else if (action) {
    actionHtml = `<button type="button" class="${action.className ?? "career-link-btn"}" ${action.datasetAttr ?? ""} style="${action.style ?? "font-size: 0.72rem; color: #38bdf8;"}">${escapeHtml(action.label)}</button>`;
  }

  let badgeHtml = "";
  if (valueBadge) {
    const bg = valueBadge.color
      ? `background: ${valueBadge.color}22; color: ${valueBadge.color}; border-color: ${valueBadge.color}55;`
      : "";
    badgeHtml = `<span class="group-tag" style="${bg} ${valueBadge.style ?? "font-size: 0.68rem;"}">${escapeHtml(valueBadge.text)}</span>`;
  }

  let headerHtml = "";
  if (customHeader) {
    headerHtml = customHeader;
  } else if (kicker || title || actionHtml) {
    headerHtml = `
      <div class="ui-tile-header">
        ${kicker ? `<span class="career-kicker">${escapeHtml(kicker)}</span>` : ""}
        ${title ? `<strong style="color: #f8fafc; font-size: 0.95rem;">${escapeHtml(title)}</strong>` : ""}
        ${actionHtml}
      </div>`;
  }

  let valueHtml = "";
  if (value !== undefined) {
    const col = valueColor ? `color: ${valueColor};` : "";
    valueHtml = `
      <div class="ui-tile-value-row">
        <strong class="ui-tile-value" style="${col}">${value}</strong>
        ${badgeHtml}
      </div>`;
  }

  return `
    <section class="career-metric ${className}" style="${style}" ${datasetAttr}>
      ${headerHtml}
      ${valueHtml}
      ${subtitle ? `<p style="margin-top: 0.35rem; font-size: 0.78rem; color: #cbd5e1;">${subtitle}</p>` : ""}
      ${content ? content : ""}
      ${footer ? `<p style="margin-top: 0.25rem; font-size: 0.72rem; color: #94a3b8;">${footer}</p>` : ""}
    </section>`;
};

export interface WindowOptions {
  kicker?: string;
  title?: string;
  customHeader?: string;
  maxWidth?: string;
  backdropCloseAttr?: string;
  closeBtnAttr?: string;
  body: string;
  footer?: string;
  className?: string;
  dialogStyle?: string;
}

export const createWindow = (options: WindowOptions): string => {
  const {
    kicker,
    title,
    customHeader,
    maxWidth,
    backdropCloseAttr = "",
    closeBtnAttr = "",
    body,
    footer,
    className = "",
    dialogStyle = "",
  } = options;

  const styleAttr = maxWidth
    ? `max-width: ${maxWidth}; ${dialogStyle}`
    : dialogStyle;

  let headerHtml = "";
  if (customHeader) {
    headerHtml = `
      <div class="career-modal-header">
        ${customHeader}
        <button type="button" class="career-modal-close" ${closeBtnAttr} aria-label="Close">✕</button>
      </div>`;
  } else {
    headerHtml = `
      <div class="career-modal-header">
        <div>
          ${kicker ? `<span class="career-kicker">${escapeHtml(kicker)}</span>` : ""}
          ${title ? `<h3 style="margin: 0.2rem 0; font-size: 1.15rem; color: #f8fafc;">${escapeHtml(title)}</h3>` : ""}
        </div>
        <button type="button" class="career-modal-close" ${closeBtnAttr} aria-label="Close">✕</button>
      </div>`;
  }

  return `
    <div class="career-modal-backdrop ${className}" ${backdropCloseAttr}>
      <div class="career-modal-dialog" style="${styleAttr}">
        ${headerHtml}
        <div class="career-modal-body">
          ${body}
        </div>
        ${footer ? `<div class="career-modal-footer" style="padding: 0.75rem 1.25rem; border-top: 1px solid rgb(255 255 255 / 10%); background: rgba(0,0,0,0.2);">${footer}</div>` : ""}
      </div>
    </div>`;
};
