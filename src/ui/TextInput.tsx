import { tokens } from '../design-system/tokens'

export interface TextInputProps {
  label: string
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'password'
  value?: string
  onChange?: (value: string) => void
}

export function TextInput({
  label,
  placeholder,
  required = false,
  type = 'text',
  value,
  onChange,
}: TextInputProps) {
  const labelStyles: React.CSSProperties = {
    display: 'block',
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  }

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: tokens.spacing.sm,
    fontSize: tokens.fontSize.md,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.sm,
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  }

  const containerStyles: React.CSSProperties = {
    marginBottom: tokens.spacing.md,
  }

  return (
    <div style={containerStyles}>
      <label style={labelStyles}>
        {label}
        {required && (
          <span style={{ color: tokens.colors.danger, marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={inputStyles}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = tokens.colors.primary
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = tokens.colors.border
        }}
      />
    </div>
  )
}

