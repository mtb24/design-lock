import { canonicalJson } from './canonical.js'
import { diffContracts } from './contract-diff.js'
import type { ActivationApproval, ActivationDecision, ContractArtifact, TrustStatus } from './contract-types.js'

export function reviewIdentity(artifact: ContractArtifact): string {
  return canonicalJson(artifact)
}

const SELF_REVIEWERS = new Set(['self', 'generator', 'compiler', 'candidate', 'bootstrap'])

function embedsApproval(candidate: ContractArtifact): boolean {
  const record = candidate as ContractArtifact & { approval?: unknown }
  if ('approval' in record) return true
  const provenance = candidate.provenance as ContractArtifact['provenance'] & { approval?: unknown; approved?: unknown }
  return 'approval' in provenance || provenance.approved === true
}

export function assessActivation(input: {
  baseline: ContractArtifact
  candidate: ContractArtifact
  approval: ActivationApproval | null
  candidateCommit: string
  verifierSourceHash: string
  trustStatus: TrustStatus
}): ActivationDecision {
  const diff = diffContracts(input.baseline, input.candidate)
  const bootstrap = input.trustStatus === 'bootstrap-review-pending'
  const decision = (activated: boolean, reason: string): ActivationDecision => ({
    activated,
    bootstrap,
    reason,
    diff,
  })
  if (embedsApproval(input.candidate)) {
    return decision(false, 'A candidate-authored approval flag is not authorization')
  }
  if (diff.classification === 'unchanged') {
    return decision(false, bootstrap ? 'No effective change. Bootstrap review is still pending.' : 'No effective change.')
  }
  const approval = input.approval
  if (!approval) return decision(false, 'Review is required before activation')
  if (SELF_REVIEWERS.has(approval.reviewer.trim().toLowerCase())) {
    return decision(false, 'Self-approval is rejected')
  }
  if (approval.candidateCommit !== input.candidateCommit) {
    return decision(false, 'Stale approval: candidate commit does not match the reviewed revision')
  }
  if (approval.oldReviewIdentity !== reviewIdentity(input.baseline)) {
    return decision(false, 'Stale approval: old review identity does not match the trusted baseline')
  }
  if (approval.newReviewIdentity !== reviewIdentity(input.candidate)) {
    return decision(false, 'Stale approval: new review identity does not match the candidate')
  }
  if (approval.verifierSourceHash !== input.verifierSourceHash) {
    return decision(false, 'Approval verifier revision does not match the reviewed verifier')
  }
  if (bootstrap) {
    return decision(false, 'Bootstrap review is pending, so this approval cannot establish the initial trusted baseline')
  }
  return decision(true, 'Exact approval matches the baseline, candidate, and reviewed verifier')
}
