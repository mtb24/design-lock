import { tokens } from '../design-system/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  type = 'button',
}: ButtonProps) {
  // Map variant to token colors
  const colorMap = {
    primary: {
      bg: tokens.colors.primary,
      hover: tokens.colors.primaryHover,
      text: '#ffffff',
    },
    secondary: {
      bg: tokens.colors.neutral,
      hover: tokens.colors.neutralHover,
      text: '#ffffff',
    },
    danger: {
      bg: tokens.colors.danger,
      hover: tokens.colors.dangerHover,
      text: '#ffffff',
    },
  }

  // Map size to token spacing
  const sizeMap = {
    sm: {
      padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
      fontSize: tokens.fontSize.sm,
    },
    md: {
      padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
      fontSize: tokens.fontSize.md,
    },
    lg: {
      padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
      fontSize: tokens.fontSize.lg,
    },
  }

  const colors = colorMap[variant]
  const sizing = sizeMap[size]

  const baseStyles: React.CSSProperties = {
    backgroundColor: colors.bg,
    color: colors.text,
    padding: sizing.padding,
    fontSize: sizing.fontSize,
    fontWeight: tokens.fontWeight.medium,
    borderRadius: tokens.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      style={baseStyles}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg
      }}
    >
      {children}
    </button>
  )
}

