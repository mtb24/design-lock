import { decisionHash } from './trusted-decision.js'

export function verifierSourceHash(repoRoot: string): string {
  return decisionHash(repoRoot)
}
