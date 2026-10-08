import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assessActivation } from '../../../src/activation.js'
import type { ActivationApproval, ContractArtifact, TrustStatus } from '../../../src/contract-types.js'

export const DECISION_FILES = [
  'src/index.ts',
  'src/activation.ts',
  'src/canonical.ts',
  'src/contract-diff.ts',
  'src/contract-types.ts',
  'packages/compiler/src/hash.ts',
  'packages/compiler/src/check.ts',
  'packages/compiler/src/bootstrap.ts',
  'packages/compiler/src/verifier.ts',
  'packages/compiler/src/cli.ts',
  'packages/compiler/src/trusted-decision.ts',
]

export function decisionHash(root: string): string {
  const hash = createHash('sha256')
  for (const file of DECISION_FILES) hash.update(readFileSync(join(root, file), 'utf8')).update('\n---\n')
  return hash.digest('hex')
}

type Request = {
  baseline: ContractArtifact
  candidate: ContractArtifact
  approval: ActivationApproval | null
  trustStatus: TrustStatus
  candidateRoot: string
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (!isMain) {
  // Imported for the decision file list and hash. The CLI executes this file directly.
} else {
const request = JSON.parse(readFileSync(0, 'utf8')) as Request
const trustedRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const trusted = decisionHash(trustedRoot)
const candidate = decisionHash(request.candidateRoot)
const decision = assessActivation({
  baseline: request.baseline,
  candidate: request.candidate,
  approval: request.approval,
  verifierSourceHash: trusted,
  trustStatus: request.trustStatus,
})
const altered = trusted !== candidate
console.log(JSON.stringify({
  decision,
  trustedVerifier: trusted,
  candidateVerifier: candidate,
  altered,
}))
process.exit(altered || (!decision.activated && decision.diff.classification !== 'unchanged') ? 4 : 0)
}
