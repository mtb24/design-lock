import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import {
  assessActivation,
  canonicalJson,
  reviewIdentity,
  diffContracts,
  evaluateDesignLock,
  type ActivationApproval,
  type BootstrapApproval,
  type ContractArtifact,
  type DesignSystemAdapter,
  type TrustStatus,
} from '@design-lock/core'
import { verifyBootstrapApproval } from './bootstrap.js'
import { activeContractPath, checkExitCode, resolveBaselineText } from './check.js'
import { compilePolicy } from './compile.js'
import { parsePolicy } from './policy.js'
import { DECISION_FILES } from './trusted-decision.js'
import { verifierSourceHash } from './verifier.js'

const repo = process.cwd()
const args = process.argv.slice(3)
const policies = [
  { name: 'mui', file: 'contracts/policy/mui.json' },
  { name: 'carbon', file: 'contracts/policy/carbon.json' },
]

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`)
}

async function compiled(file: string): Promise<ContractArtifact> {
  const result = await compilePolicy(parsePolicy(readJson(join(repo, file))), repo)
  if (!result.ok) {
    console.error(result.diagnostics.join('\n'))
    process.exit(1)
  }
  return result.artifact
}

function gitFile(revision: string, file: string): string | null {
  const result = spawnSync('git', ['show', `${revision}:${file}`], { cwd: repo, encoding: 'utf8' })
  return result.status === 0 ? result.stdout : null
}

function flag(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function currentRevision(): string {
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' })
  if (revision.status !== 0) fail('could not resolve the candidate commit')
  return revision.stdout.trim()
}

type TrustFile = {
  status: TrustStatus
  baselines: Record<string, string>
}

function trustFile(): TrustFile {
  return readJson(join(repo, 'contracts/trust.json')) as TrustFile
}

async function generate() {
  for (const policy of policies) {
    const artifact = await compiled(policy.file)
    writeJson(join(repo, 'contracts/generated', `${policy.name}.json`), artifact)
    console.log(`generated contracts/generated/${policy.name}.json ${artifact.semanticHash}`)
  }
}

function materializeTrusted(base: string): string {
  const dir = mkdtempSync(join(repo, '.trusted-verifier-'))
  for (const file of DECISION_FILES) {
    const text = gitFile(base, file)
    if (text === null) {
      rmSync(dir, { recursive: true, force: true })
      console.error(`trusted base ${base} has no verifier file ${file}`)
      process.exit(4)
    }
    const path = join(dir, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
  return dir
}

function trustedDecision(base: string, input: {
  baseline: ContractArtifact
  candidate: ContractArtifact
  approval: ActivationApproval | null
  candidateCommit: string
  trustStatus: TrustStatus
}): { activated: boolean; classification: string; reason: string; altered: boolean } {
  const dir = materializeTrusted(base)
  const result = spawnSync('npx', ['tsx', join(dir, 'packages/compiler/src/trusted-decision.ts')], {
    cwd: repo,
    input: JSON.stringify({ ...input, candidateRoot: repo }),
    encoding: 'utf8',
  })
  rmSync(dir, { recursive: true, force: true })
  const output = JSON.parse(result.stdout || '{}') as {
    decision?: { activated: boolean; reason: string; diff: { classification: string } }
    altered?: boolean
  }
  if (!output.decision) {
    console.error(result.stderr || 'trusted verifier produced no decision')
    process.exit(4)
  }
  return {
    activated: output.decision.activated,
    classification: output.decision.diff.classification,
    reason: output.altered ? 'candidate verifier differs from the trusted base and cannot authorize itself' : output.decision.reason,
    altered: Boolean(output.altered),
  }
}

function runtimeTrust(base: string | undefined, trusted: boolean): TrustFile {
  if (!trusted || !base) return trustFile()
  const text = gitFile(base, 'contracts/trust.json')
  if (text === null) {
    console.error(`trusted base ${base} has no contracts/trust.json`)
    process.exit(4)
  }
  const selected = JSON.parse(text) as TrustFile
  if (canonicalJson(selected) !== canonicalJson(trustFile())) {
    console.error('candidate trust configuration differs from the selected trusted base')
    process.exit(4)
  }
  return selected
}

function activeMatches(policyName: string, baseline: ContractArtifact, candidate: ContractArtifact, approved: boolean): boolean {
  const active = readJson(join(repo, activeContractPath(policyName))) as ContractArtifact
  const activeId = reviewIdentity(active)
  const expected = approved ? reviewIdentity(candidate) : reviewIdentity(baseline)
  if (activeId === expected) return true
  console.error(`${policyName}: active contract does not match the trusted baseline or approved successor`)
  return false
}

async function comparePolicy(policy: (typeof policies)[number], verifier: string, write: boolean): Promise<number> {
  const base = flag('--base')
  const trusted = args.includes('--trusted')
  const trust = runtimeTrust(base, trusted)
  const artifact = await compiled(policy.file)
  const generatedPath = join(repo, 'contracts/generated', `${policy.name}.json`)
  if (write) writeJson(generatedPath, artifact)
  const committed = readJson(generatedPath) as ContractArtifact
  const fresh = canonicalJson(committed) === canonicalJson(artifact)
  const baselinePath = activeContractPath(policy.name)
  if (trust.baselines[policy.name] !== baselinePath) {
    console.error(`${policy.name}: trust configuration does not select the runtime contract`)
    return 4
  }
  const workspaceText = readFileSync(join(repo, baselinePath), 'utf8')
  const baseText = base ? gitFile(base, baselinePath) : null
  const resolved = resolveBaselineText({
    workspaceText,
    baseText,
    envBaseline: process.env.DESIGN_LOCK_BASELINE,
    baseRequested: trusted || Boolean(base),
  })
  if (resolved.source === 'missing-trusted-base') {
    console.error(`${policy.name}: trusted base ${base} does not contain ${baselinePath}`)
    return 4
  }
  const baseline = JSON.parse(resolved.text) as ContractArtifact
  return finishComparison(policy.name, fresh, resolved.source, baseline, artifact, trust, verifier, trusted && Boolean(base) ? base : undefined)
}

function finishComparison(
  name: string,
  fresh: boolean,
  source: string,
  baseline: ContractArtifact,
  artifact: ContractArtifact,
  trust: TrustFile,
  verifier: string,
  base: string | undefined,
): number {
  const approval = approvalFor(approvalFile(), name)
  const candidateCommit = approval ? cleanCandidateRevision() : currentRevision()
  const decided = base
    ? trustedDecision(base, { baseline, candidate: artifact, approval, candidateCommit, trustStatus: trust.status })
    : assessActivation({ baseline, candidate: artifact, approval, candidateCommit, verifierSourceHash: verifier, trustStatus: trust.status })
  const classification = 'diff' in decided ? decided.diff.classification : decided.classification
  if ('altered' in decided && decided.altered) {
    console.error(`${name}: ${decided.reason}`)
    return 4
  }
  if (!activeMatches(name, baseline, artifact, classification !== 'unchanged' && decided.activated)) return 4
  const code = checkExitCode(fresh, classification === 'unchanged' || decided.activated)
  console.log(`${name}: fresh=${fresh} baseline=${source} classification=${classification} exit=${code}`)
  if (classification !== 'unchanged') console.log(`  ${decided.reason}`)
  return code
}

function approvalFile(): ActivationApproval | Record<string, ActivationApproval> | null {
  const approvalPath = flag('--approval')
  if (!approvalPath) return null
  return readJson(isAbsolute(approvalPath) ? approvalPath : join(repo, approvalPath)) as ActivationApproval | Record<string, ActivationApproval>
}

function approvalFor(
  file: ActivationApproval | Record<string, ActivationApproval> | null,
  name: string,
): ActivationApproval | null {
  if (!file) return null
  if ('oldReviewIdentity' in file && 'reviewer' in file) return file as ActivationApproval
  return (file as Record<string, ActivationApproval>)[name] ?? null
}

function externalApprovalPath(value: string): string {
  const path = realpathSync(isAbsolute(value) ? value : join(repo, value))
  const fromRepo = relative(repo, path)
  if (fromRepo === '' || (fromRepo !== '..' && !fromRepo.startsWith(`..${sep}`))) fail('bootstrap approval must be supplied from outside the candidate repository')
  return path
}

function fail(message: string): never {
  console.error(message)
  process.exit(4)
}

function assertBootstrapBase(base: string) {
  if (gitFile(base, 'packages/compiler/src/verifier.ts') !== null || gitFile(base, 'contracts/trust.json') !== null) {
    fail('bootstrap-review is forbidden because the selected base already contains trusted-enforcement state')
  }
}

function cleanCandidateRevision(): string {
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' })
  if (status.status !== 0 || status.stdout.trim()) fail('approval requires a clean, committed candidate')
  return currentRevision()
}

async function bootstrapContracts(): Promise<Record<'mui' | 'carbon', ContractArtifact>> {
  const contracts = {} as Record<'mui' | 'carbon', ContractArtifact>
  for (const policy of policies) {
    const artifact = await compiled(policy.file)
    const generated = readJson(join(repo, 'contracts/generated', `${policy.name}.json`)) as ContractArtifact
    const active = readJson(join(repo, activeContractPath(policy.name))) as ContractArtifact
    if (canonicalJson(generated) !== canonicalJson(artifact) || canonicalJson(active) !== canonicalJson(artifact)) {
      fail(`${policy.name}: bootstrap seed, generated candidate, and current inputs must match exactly`)
    }
    contracts[policy.name as 'mui' | 'carbon'] = artifact
  }
  return contracts
}

async function bootstrapReview() {
  const base = flag('--base')
  const approvalFlag = flag('--approval')
  if (!base || !approvalFlag) fail('bootstrap-review requires --base REV and --approval PATH')
  assertBootstrapBase(base)
  if (trustFile().status !== 'reviewed') fail('bootstrap-review requires the candidate trust status to be reviewed')
  const candidateCommit = cleanCandidateRevision()
  const contracts = await bootstrapContracts()

  const approval = readJson(externalApprovalPath(approvalFlag)) as BootstrapApproval
  const verifier = verifierSourceHash(repo)
  const errors = verifyBootstrapApproval({
    approval,
    candidateCommit,
    verifierSourceHash: verifier,
    contracts,
  })
  if (errors.length) {
    for (const error of errors) console.error(error)
    process.exit(4)
  }
  console.log('BOOTSTRAP LIMITATION: no trusted predecessor contains the verifier; this one-time decision relies on protected external review evidence.')
  console.log(`bootstrap-reviewed candidate=${candidateCommit} verifier=${verifier} reviewer=${approval.reviewer}`)
}

async function compareAll(write: boolean) {
  const trust = trustFile()
  const base = flag('--base')
  const trusted = args.includes('--trusted')
  if (trusted && !base) {
    console.error('trusted enforcement requires --base REV')
    process.exit(4)
  }
  const verifier = verifierSourceHash(repo)
  let exitCode = 0
  for (const policy of policies) exitCode = Math.max(exitCode, await comparePolicy(policy, verifier, write))
  if (trust.status === 'bootstrap-review-pending') {
    console.log('bootstrap-review-pending: seed and verifier have no independent review. Matching hashes are not approval.')
  }
  console.log(`verifier ${verifier}`)
  if (!write) process.exit(exitCode)
}

async function diff() {
  const trust = trustFile()
  for (const policy of policies) {
    const artifact = await compiled(policy.file)
    const baseline = readJson(join(repo, trust.baselines[policy.name])) as ContractArtifact
    const result = diffContracts(baseline, artifact)
    console.log(`${policy.name}: ${result.classification}`)
    for (const change of result.changes) console.log(`  ${change.kind} ${change.path}: ${change.detail}`)
  }
}

function adapterFor(artifact: ContractArtifact): DesignSystemAdapter<unknown> {
  const registry = Object.fromEntries(artifact.semantic.components.map((component) => [component.modelName, component.schema]))
  return {
    id: artifact.semantic.id,
    label: artifact.semantic.id,
    registry: registry as DesignSystemAdapter['registry'],
    schemas: artifact.semantic.components.map((component) => component.schema),
    render: (tree) => tree,
  }
}

async function evaluate() {
  const name = flag('--contract') ?? 'mui'
  const mode = (flag('--mode') ?? 'strict') as 'strict' | 'report' | 'lenient'
  const fixture = flag('--fixture')
  const raw = fixture ? readFileSync(join(repo, fixture), 'utf8') : flag('--input')
  if (!raw) {
    console.error('evaluate requires --fixture or --input')
    process.exit(1)
  }
  const preview = args.includes('--preview')
  const artifact = readJson(join(repo, preview ? `contracts/generated/${name}.json` : activeContractPath(name))) as ContractArtifact
  const result = evaluateDesignLock({ rawResponse: raw, mode, adapter: adapterFor(artifact) })
  console.log(JSON.stringify({
    contract: preview ? 'generated-preview' : 'active-baseline',
    blocked: result.blocked,
    errors: result.validation.errors,
    rendered: result.rendered,
  }, null, 2))
  process.exit(result.blocked ? 1 : 0)
}

async function activate() {
  const approvalPath = flag('--approval')
  if (!approvalPath) {
    console.error('activate requires --approval')
    process.exit(4)
  }
  const approval = readJson(isAbsolute(approvalPath) ? approvalPath : join(repo, approvalPath)) as ActivationApproval | Record<string, ActivationApproval>
  const trust = trustFile()
  const verifier = verifierSourceHash(repo)
  const requested = flag('--contract')
  const selected = requested ? policies.filter((policy) => policy.name === requested) : policies
  if (selected.length === 0) {
    console.error(`unknown contract ${requested}`)
    process.exit(4)
  }
  const pending: Array<{ name: string; file: string; artifact: ContractArtifact }> = []
  for (const policy of selected) {
    const artifact = await compiled(policy.file)
    if (trust.baselines[policy.name] !== activeContractPath(policy.name)) {
      console.error(`${policy.name}: trust configuration does not select the runtime contract`)
      process.exit(4)
    }
    const baseline = readJson(join(repo, activeContractPath(policy.name))) as ContractArtifact
    if (canonicalJson(baseline) === canonicalJson(artifact)) {
      console.log(`${policy.name}: unchanged`)
      continue
    }
    const decision = assessActivation({
      baseline,
      candidate: artifact,
      approval: approvalFor(approval, policy.name),
      candidateCommit: cleanCandidateRevision(),
      verifierSourceHash: verifier,
      trustStatus: trust.status,
    })
    console.log(`${policy.name}: ${decision.reason}`)
    if (!decision.activated) process.exit(4)
    pending.push({ name: policy.name, file: activeContractPath(policy.name), artifact })
  }
  for (const update of pending) writeJson(join(repo, update.file), update.artifact)
  writeJson(join(repo, 'contracts/activation/record.json'), { approval, verifierSourceHash: verifier })
}

const command = process.argv[2]
const commands: Record<string, () => Promise<void>> = {
  generate,
  check: () => compareAll(false),
  'bootstrap-review': bootstrapReview,
  diff,
  evaluate,
  activate,
}
if (!command || !commands[command]) {
  console.error('Usage: cli.ts <generate|check|bootstrap-review|diff|evaluate|activate>')
  process.exit(1)
}
await commands[command]()
