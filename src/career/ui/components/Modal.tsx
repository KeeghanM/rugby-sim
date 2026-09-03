import type React from 'react'

export interface ModalProps {
  kicker?: string
  title?: string
  customHeader?: React.ReactNode
  maxWidth?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  dialogStyle?: React.CSSProperties
}

export const Modal: React.FC<ModalProps> = ({
  kicker,
  title,
  customHeader,
  maxWidth,
  onClose,
  children,
  footer,
  className = '',
  dialogStyle,
}) => {
  return (
    /* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss */
    /* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-dismiss */
    <div
      className={`career-modal-backdrop ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="career-modal-dialog"
        style={{
          ...(maxWidth ? { maxWidth } : {}),
          ...dialogStyle,
        }}
      >
        <div className="career-modal-header">
          {customHeader ? (
            customHeader
          ) : (
            <div>
              {kicker && <span className="career-kicker">{kicker}</span>}
              {title && (
                <h3
                  style={{
                    margin: '0.2rem 0',
                    fontSize: '1.15rem',
                    color: '#f8fafc',
                  }}
                >
                  {title}
                </h3>
              )}
            </div>
          )}
          <button type="button" className="career-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="career-modal-body">{children}</div>
        {footer && (
          <div
            className="career-modal-footer"
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid rgb(255 255 255 / 10%)',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
