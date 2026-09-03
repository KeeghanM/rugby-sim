import React from 'react'

export interface TileAction {
  label: string
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export interface TileProps {
  kicker?: string
  title?: string
  action?: TileAction | React.ReactNode
  value?: string | number
  valueColor?: string
  valueBadge?: { text: string; color?: string; style?: React.CSSProperties }
  subtitle?: React.ReactNode
  content?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  customHeader?: React.ReactNode
}

export const Tile: React.FC<TileProps> = ({
  kicker,
  title,
  action,
  value,
  valueColor,
  valueBadge,
  subtitle,
  content,
  footer,
  className = '',
  style,
  customHeader,
}) => {
  return (
    <section className={`career-metric ${className}`} style={style}>
      {customHeader ? (
        customHeader
      ) : kicker || title || action ? (
        <div className="ui-tile-header">
          {kicker && <span className="career-kicker">{kicker}</span>}
          {title && <strong className="ui-tile-title">{title}</strong>}
          {action &&
            (React.isValidElement(action) ? (
              action
            ) : typeof action === 'object' && 'label' in action ? (
              <button
                type="button"
                className={action.className ?? 'career-link-btn'}
                onClick={action.onClick}
                style={action.style}
              >
                {action.label}
              </button>
            ) : null)}
        </div>
      ) : null}

      {value !== undefined && (
        <div className="ui-tile-value-row">
          <strong className="ui-tile-value" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </strong>
          {valueBadge && (
            <span
              className="group-tag"
              style={{
                background: valueBadge.color ? `${valueBadge.color}22` : undefined,
                color: valueBadge.color,
                borderColor: valueBadge.color ? `${valueBadge.color}55` : undefined,
                fontSize: '0.68rem',
                ...valueBadge.style,
              }}
            >
              {valueBadge.text}
            </span>
          )}
        </div>
      )}

      {subtitle && <p className="ui-tile-subtitle">{subtitle}</p>}

      {content}

      {footer && <p className="ui-tile-footer">{footer}</p>}
    </section>
  )
}
