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
          {title && <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>{title}</strong>}
          {action &&
            (React.isValidElement(action) ? (
              action
            ) : typeof action === 'object' && 'label' in action ? (
              <button
                type="button"
                className={action.className ?? 'career-link-btn'}
                onClick={action.onClick}
                style={{
                  fontSize: '0.72rem',
                  color: '#38bdf8',
                  ...action.style,
                }}
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

      {subtitle && (
        <p
          style={{
            marginTop: '0.35rem',
            fontSize: '0.78rem',
            color: '#cbd5e1',
          }}
        >
          {subtitle}
        </p>
      )}

      {content}

      {footer && (
        <p
          style={{
            marginTop: '0.25rem',
            fontSize: '0.72rem',
            color: '#94a3b8',
          }}
        >
          {footer}
        </p>
      )}
    </section>
  )
}
