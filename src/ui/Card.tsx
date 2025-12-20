import { tokens } from '../design-system/tokens'

export type CardPadding = 'sm' | 'md' | 'lg'

export interface CardProps {
  padding?: CardPadding
  children: React.ReactNode
}

export function Card({ padding = 'md', children }: CardProps) {
  const paddingMap = {
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
  }

  const styles: React.CSSProperties = {
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: paddingMap[padding],
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  }

  return <div style={styles}>{children}</div>
}

