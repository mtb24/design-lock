import type { ComponentProps } from 'react'
import type MuiButton from '@mui/material/Button'
import type MuiChip from '@mui/material/Chip'
import type { Button as CarbonButton } from '@carbon/react'
import type { TagBaseProps } from '@carbon/react/lib/components/Tag/Tag.js'

export const acceptedMuiButton = {
  children: 'Save',
  variant: 'contained' as const,
  color: 'primary' as const,
  disabled: true,
} satisfies ComponentProps<typeof MuiButton>

export const acceptedMuiChip = {
  label: 'Ready',
  variant: 'outlined' as const,
  color: 'primary' as const,
  disabled: true,
} satisfies ComponentProps<typeof MuiChip>

export const acceptedCarbonButton = {
  children: 'Continue',
  kind: 'danger' as const,
  disabled: true,
} satisfies ComponentProps<typeof CarbonButton>

export const acceptedCarbonTag = {
  children: 'Beta',
  type: 'blue' as const,
  size: 'md' as const,
  disabled: true,
} satisfies TagBaseProps

type NeonRejected = 'neon' extends NonNullable<ComponentProps<typeof MuiButton>['color']> ? never : true
export const neonIsNotAMuiButtonColor: NeonRejected = true

type OutlinePresent = 'outline' extends NonNullable<TagBaseProps['type']> ? true : never
export const outlineRemainsAnUpstreamTagType: OutlinePresent = true
