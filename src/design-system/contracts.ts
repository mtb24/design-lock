/**
 * Design System Contract
 * Single source of truth for allowed components, props, and tokens
 * Used for both AI prompting and validation
 */

export const DS_CONTRACT = {
  components: {
    Button: {
      props: {
        variant: {
          type: 'enum' as const,
          values: ['primary', 'secondary', 'danger'],
          required: false,
          default: 'primary',
        },
        size: {
          type: 'enum' as const,
          values: ['sm', 'md', 'lg'],
          required: false,
          default: 'md',
        },
        children: {
          type: 'string' as const,
          required: true,
        },
        onClick: {
          type: 'function' as const,
          required: false,
        },
      },
    },
    Card: {
      props: {
        padding: {
          type: 'enum' as const,
          values: ['sm', 'md', 'lg'],
          required: false,
          default: 'md',
        },
        children: {
          type: 'ReactNode' as const,
          required: true,
        },
      },
    },
    TextInput: {
      props: {
        label: {
          type: 'string' as const,
          required: true,
        },
        placeholder: {
          type: 'string' as const,
          required: false,
        },
        required: {
          type: 'boolean' as const,
          required: false,
          default: false,
        },
        type: {
          type: 'enum' as const,
          values: ['text', 'email', 'password'],
          required: false,
          default: 'text',
        },
      },
    },
  },
  tokens: {
    colors: [
      'primary',
      'primaryHover',
      'neutral',
      'neutralHover',
      'danger',
      'dangerHover',
      'text',
      'textLight',
      'border',
      'background',
      'backgroundHover',
    ],
    spacing: ['sm', 'md', 'lg'],
    radius: ['sm', 'md'],
    fontSize: ['sm', 'md', 'lg'],
    fontWeight: ['normal', 'medium', 'semibold'],
  },
  rules: [
    'Only use components listed in the contract',
    'Only use props defined for each component',
    'Use only token keys for styling (no hardcoded values)',
    'Required props must always be provided',
    'Enum props must use one of the specified values',
  ],
} as const

export type DSContract = typeof DS_CONTRACT
export type ComponentName = keyof typeof DS_CONTRACT.components
