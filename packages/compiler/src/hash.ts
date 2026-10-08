import { createHash } from 'node:crypto'
import { canonicalJson } from '@design-lock/core'

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function hashJson(value: unknown): string {
  return sha256(canonicalJson(value))
}
