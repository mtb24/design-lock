import { canonicalJson, reviewIdentity, type BootstrapApproval, type ContractArtifact } from '@design-lock/core'
import { hashJson, sha256 } from './hash.js'

const SELF_REVIEWERS = new Set(['self', 'generator', 'compiler', 'candidate', 'bootstrap'])
const CONTRACT_NAMES = ['carbon', 'mui'] as const

export function bootstrapContractIdentity(artifact: ContractArtifact) {
  return {
    reviewIdentityHash: sha256(reviewIdentity(artifact)),
    semanticHash: artifact.semanticHash,
    provenanceHash: artifact.provenanceHash,
    policyInputHash: artifact.provenance.policyHash,
    tokenInputsHash: hashJson(artifact.provenance.tokens),
  }
}

export function verifyBootstrapApproval(input: {
  approval: BootstrapApproval
  candidateCommit: string
  verifierSourceHash: string
  contracts: Record<(typeof CONTRACT_NAMES)[number], ContractArtifact>
}): string[] {
  const errors: string[] = []
  const { approval } = input
  if (approval.kind !== 'design-lock-bootstrap-v1') errors.push('unsupported bootstrap approval kind')
  if (approval.candidateCommit !== input.candidateCommit) errors.push('bootstrap approval does not match the exact candidate commit')
  if (approval.verifierSourceHash !== input.verifierSourceHash) errors.push('bootstrap approval does not match the verifier identity')
  if (!approval.reviewer?.trim() || SELF_REVIEWERS.has(approval.reviewer.trim().toLowerCase())) {
    errors.push('bootstrap approval does not identify an independent reviewer')
  }
  if (!approval.evidence?.trim()) errors.push('bootstrap approval has no evidence reference')

  const approvedNames = Object.keys(approval.contracts ?? {}).sort()
  if (canonicalJson(approvedNames) !== canonicalJson([...CONTRACT_NAMES])) {
    errors.push('bootstrap approval must cover exactly the MUI and Carbon seeds')
    return errors
  }
  for (const name of CONTRACT_NAMES) {
    const expected = bootstrapContractIdentity(input.contracts[name])
    if (canonicalJson(approval.contracts[name]) !== canonicalJson(expected)) {
      errors.push(`${name}: bootstrap approval does not match the reviewed contract, policy, and token inputs`)
    }
  }
  return errors
}
