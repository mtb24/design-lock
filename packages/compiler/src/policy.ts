export type PropPolicy = {
  representation?: 'text'
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  select?: Array<string | number | boolean>
  required?: boolean
  tokenFamily?: string
  tokenKeyPattern?: string
}

export type BranchPolicy = {
  module: string
  exportName: string
  importKind: 'named' | 'default'
  root: string
}

export type ComponentPolicy = {
  modelName: string
  packageName: string
  module: string
  exportName: string
  importKind: 'named' | 'default'
  branch?: BranchPolicy
  props: Record<string, PropPolicy>
  exclude?: string[]
  bindings?: Record<string, { value: string | number | boolean }>
}

export type TokenPolicy = {
  family: string
  reader: 'mui-palette' | 'carbon-tag-background' | 'fixture-file'
  source?: string
}

export type ExtractionPolicy = {
  id: string
  components: ComponentPolicy[]
  tokens?: TokenPolicy[]
}

const READERS = new Set(['mui-palette', 'carbon-tag-background', 'fixture-file'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parsePolicy(value: unknown): ExtractionPolicy {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.components)) {
    throw new Error('Policy must include an id and components')
  }
  const tokens = Array.isArray(value.tokens) ? value.tokens : []
  for (const token of tokens) {
    if (!isRecord(token) || typeof token.reader !== 'string' || !READERS.has(token.reader)) {
      throw new Error('Policy token reader is not an allowlisted trusted reader')
    }
  }
  return value as ExtractionPolicy
}
