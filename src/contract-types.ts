export type CoverageAuthority = 'derived' | 'policy' | 'adapter' | 'excluded' | 'unsupported'

export type CoverageEntry = {
  field: string
  authority: CoverageAuthority
  detail: string
}

export type ContractSemantic = {
  id: string
  components: Array<{ modelName: string; schema: Record<string, unknown> }>
  tokenKeys: Array<{ family: string; keys: string[] }>
}

export type TokenProvenance = {
  family: string
  packageName: string
  packageVersion: string
  theme: string
  sourcePath: string
  values: Record<string, string>
  unresolvedAliases: string[]
  contentHash: string
}

export type ComponentProvenance = {
  modelName: string
  packageName: string
  packageVersion: string
  exportName: string
  moduleSpecifier: string
  rootBinding: string
  declarationPath: string
  symbolName: string
  declarationHash: string
  coverage: CoverageEntry[]
}

export type ContractProvenance = {
  policyId: string
  policyHash: string
  compiler: {
    name: string
    version: string
    typescript: string
    optionsHash: string
  }
  components: ComponentProvenance[]
  tokens: TokenProvenance[]
}

export type ContractArtifact = {
  artifactVersion: 1
  semantic: ContractSemantic
  provenance: ContractProvenance
  semanticHash: string
  provenanceHash: string
}

export type ContractChangeKind =
  | 'expanded'
  | 'restricted'
  | 'provenance'
  | 'token-value'
  | 'unclassifiable'

export type ContractChange = {
  kind: ContractChangeKind
  path: string
  detail: string
}

export type ContractDiffClassification =
  | 'unchanged'
  | 'expanded'
  | 'restricted'
  | 'provenance-only'
  | 'token-value'
  | 'mixed'
  | 'unclassifiable'

export type ContractDiff = {
  changes: ContractChange[]
  classification: ContractDiffClassification
  requiresReview: boolean
}

export type ActivationApproval = {
  candidateCommit: string
  oldReviewIdentity: string
  newReviewIdentity: string
  verifierSourceHash: string
  reviewer: string
  evidence: string
}

export type BootstrapContractApproval = {
  reviewIdentityHash: string
  semanticHash: string
  provenanceHash: string
  policyInputHash: string
  tokenInputsHash: string
}

export type BootstrapApproval = {
  kind: 'design-lock-bootstrap-v1'
  candidateCommit: string
  verifierSourceHash: string
  contracts: Record<'mui' | 'carbon', BootstrapContractApproval>
  reviewer: string
  evidence: string
}

export type TrustStatus = 'bootstrap-review-pending' | 'reviewed'

export type ActivationDecision = {
  activated: boolean
  bootstrap: boolean
  reason: string
  diff: ContractDiff
}
