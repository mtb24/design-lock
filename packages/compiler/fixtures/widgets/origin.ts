export type Id = string

export interface Box {
  label?: Id
  disabled?: boolean
  href: string
}

export function Widget(props: Box & { tone: 'calm' | 'loud' }): null {
  void props
  return null
}
