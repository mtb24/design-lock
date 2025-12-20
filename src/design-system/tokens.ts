/**
 * Design System Tokens
 * All visual values defined as token keys that components can reference
 */

export const tokens = {
  colors: {
    primary: '#3b82f6',      // blue-500
    primaryHover: '#2563eb', // blue-600
    neutral: '#6b7280',      // gray-500
    neutralHover: '#4b5563', // gray-600
    danger: '#ef4444',       // red-500
    dangerHover: '#dc2626',  // red-600
    text: '#1f2937',         // gray-800
    textLight: '#6b7280',    // gray-500
    border: '#d1d5db',       // gray-300
    background: '#ffffff',
    backgroundHover: '#f9fafb', // gray-50
  },
  spacing: {
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
  },
  radius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
  },
  fontSize: {
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },
} as const

export type TokenKey = keyof typeof tokens
export type ColorKey = keyof typeof tokens.colors
export type SpacingKey = keyof typeof tokens.spacing
export type RadiusKey = keyof typeof tokens.radius

