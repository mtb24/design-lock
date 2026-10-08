import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { reviewIdentity, type ContractArtifact } from '@design-lock/core'
import { bootstrapContractIdentity } from './bootstrap.js'
import { compilePolicy } from './compile.js'
import { parsePolicy } from './policy.js'
import { decisionHash } from './trusted-decision.js'

const source = process.cwd()

function run(cwd: string, args: string[]) {
  return spawnSync('npx', ['tsx', 'packages/compiler/src/cli.ts', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'lifecycle', GIT_AUTHOR_EMAIL: 'lifecycle@example.com', GIT_COMMITTER_NAME: 'lifecycle', GIT_COMMITTER_EMAIL: 'lifecycle@example.com' },
  })
}

function enforce(cwd: string, approval = '') {
  const trusted = git(cwd, ['show', 'origin/main:scripts/enforce-trusted.sh'])
  const entrypoint = trusted.status === 0 ? join(tmpdir(), `designlock-enforce-${process.pid}.sh`) : join(cwd, 'scripts/enforce-trusted.sh')
  if (trusted.status === 0) writeFileSync(entrypoint, trusted.stdout)
  return spawnSync('sh', [entrypoint], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      BASE_REF: 'main',
      DESIGN_LOCK_APPROVAL: approval,
    },
  })
}

function git(cwd: string, args: string[]) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'lifecycle', GIT_AUTHOR_EMAIL: 'lifecycle@example.com', GIT_COMMITTER_NAME: 'lifecycle', GIT_COMMITTER_EMAIL: 'lifecycle@example.com' },
  })
}

describe('approved change lifecycle', () => {
  it('bootstraps only from protected exact-head review evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'designlock-bootstrap-'))
    const copied = spawnSync('rsync', ['-a', '--exclude', 'node_modules', '--exclude', '.git', '--exclude', 'dist', source + '/', dir + '/'])
    expect(copied.status).toBe(0)
    symlinkSync(join(source, 'node_modules'), join(dir, 'node_modules'))
    expect(git(dir, ['init']).status).toBe(0)
    writeFileSync(join(dir, '.bootstrap-base'), 'pre-verifier base\n')
    expect(git(dir, ['add', '.bootstrap-base']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'pre-verifier base']).status).toBe(0)
    const base = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    expect(git(dir, ['update-ref', 'refs/remotes/origin/main', base]).status).toBe(0)

    const trustPath = join(dir, 'contracts/trust.json')
    const trust = JSON.parse(readFileSync(trustPath, 'utf8')) as { status: string }
    trust.status = 'reviewed'
    writeFileSync(trustPath, `${JSON.stringify(trust, null, 2)}\n`)
    expect(git(dir, ['add', '-A']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'reviewed bootstrap candidate']).status).toBe(0)
    const candidate = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    const mui = JSON.parse(readFileSync(join(dir, 'contracts/baselines/mui.json'), 'utf8')) as ContractArtifact
    const carbon = JSON.parse(readFileSync(join(dir, 'contracts/baselines/carbon.json'), 'utf8')) as ContractArtifact
    const approval = {
      kind: 'design-lock-bootstrap-v1',
      candidateCommit: candidate,
      verifierSourceHash: decisionHash(dir),
      contracts: {
        mui: bootstrapContractIdentity(mui),
        carbon: bootstrapContractIdentity(carbon),
      },
      reviewer: 'independent-review-agent',
      evidence: 'review-agent:exact-head',
    }
    const approvalPath = join(tmpdir(), 'designlock-bootstrap-approval.json')
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)

    const accepted = enforce(dir, approvalPath)
    expect(accepted.status, accepted.stdout + accepted.stderr).toBe(0)
    expect(accepted.stdout).toContain('BOOTSTRAP LIMITATION')
    approval.candidateCommit = 'stale'
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const stale = enforce(dir, approvalPath)
    expect(stale.status).toBe(4)
    expect(stale.stdout + stale.stderr).toContain('exact candidate commit')

    const inside = join(dir, 'contracts/candidate-approval.json')
    writeFileSync(inside, `${JSON.stringify(approval, null, 2)}\n`)
    expect(git(dir, ['add', inside]).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'candidate-authored approval']).status).toBe(0)
    const candidateAuthored = enforce(dir, inside)
    expect(candidateAuthored.status).toBe(4)
    expect(candidateAuthored.stdout + candidateAuthored.stderr).toContain('outside the candidate repository')

    expect(git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']).status).toBe(0)
    const unchanged = enforce(dir)
    expect(unchanged.status, unchanged.stdout + unchanged.stderr).toBe(0)
  }, 180000)

  it('activates one library and enforces the exact approval', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'designlock-lifecycle-'))
    const copied = spawnSync('rsync', ['-a', '--exclude', 'node_modules', '--exclude', '.git', '--exclude', 'dist', source + '/', dir + '/'])
    expect(copied.status).toBe(0)
    symlinkSync(join(source, 'node_modules'), join(dir, 'node_modules'))
    const trustPath = join(dir, 'contracts/trust.json')
    const trust = JSON.parse(readFileSync(trustPath, 'utf8')) as { status: string }
    trust.status = 'reviewed'
    writeFileSync(trustPath, `${JSON.stringify(trust, null, 2)}\n`)
    expect(git(dir, ['init']).status).toBe(0)
    expect(git(dir, ['add', '-A']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'reviewed seed']).status).toBe(0)
    const seed = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    expect(git(dir, ['update-ref', 'refs/remotes/origin/main', seed]).status).toBe(0)
    const carbonBefore = readFileSync(join(dir, 'contracts/baselines/carbon.json'))
    const muiBefore = readFileSync(join(dir, 'contracts/baselines/mui.json'))
    expect(enforce(dir).status).toBe(0)
    const activePath = join(dir, 'contracts/baselines/mui.json')
    const widened = muiBefore.toString().replace(
      '"warning"\n              ],\n              "type": "string",\n              "x-design-lock-authority": "policy"',
      '"inherit",\n                "warning"\n              ],\n              "type": "string",\n              "x-design-lock-authority": "policy"',
    )
    writeFileSync(activePath, widened)
    const bypass = enforce(dir)
    expect(bypass.status, bypass.stdout + bypass.stderr).not.toBe(0)
    expect(bypass.stdout + bypass.stderr).toContain('active contract')
    writeFileSync(activePath, muiBefore)

    const provenanceTamper = JSON.parse(muiBefore.toString()) as ContractArtifact
    provenanceTamper.provenance.components[0].declarationHash = 'tampered'
    provenanceTamper.provenanceHash = 'tampered'
    writeFileSync(activePath, `${JSON.stringify(provenanceTamper, null, 2)}\n`)
    const provenanceBypass = enforce(dir)
    expect(provenanceBypass.status, provenanceBypass.stdout + provenanceBypass.stderr).not.toBe(0)
    expect(provenanceBypass.stdout + provenanceBypass.stderr).toContain('active contract')
    writeFileSync(activePath, muiBefore)

    const unchanged = run(dir, ['activate', '--contract', 'mui', '--approval', 'contracts/trust.json'])
    expect(unchanged.status).toBe(0)
    expect(unchanged.stdout).toContain('mui: unchanged')
    expect(readFileSync(join(dir, 'contracts/baselines/mui.json')).equals(muiBefore)).toBe(true)

    const policyPath = join(dir, 'contracts/policy/mui.json')
    writeFileSync(policyPath, readFileSync(policyPath, 'utf8').replace('"maxLength": 80', '"maxLength": 90'))
    expect(run(dir, ['generate']).status).toBe(0)
    const longLabel = JSON.stringify({ component: 'Button', children: 'S'.repeat(85), color: 'primary' })
    writeFileSync(join(dir, 'contracts/long-button.json'), longLabel)
    const ordinary = run(dir, ['evaluate', '--contract', 'mui', '--fixture', 'contracts/long-button.json'])
    expect(ordinary.status).not.toBe(0)
    const preview = run(dir, ['evaluate', '--contract', 'mui', '--preview', '--fixture', 'contracts/long-button.json'])
    expect(preview.status).toBe(0)
    expect(preview.stdout).toContain('generated-preview')
    const rejected = enforce(dir)
    expect(rejected.status).not.toBe(0)
    expect(rejected.stdout + rejected.stderr).toContain('expanded')

    const stale = run(dir, ['activate', '--contract', 'mui', '--approval', 'contracts/trust.json'])
    expect(stale.status).toBe(4)
    expect(readFileSync(join(dir, 'contracts/baselines/mui.json')).equals(muiBefore)).toBe(true)
    expect(readFileSync(join(dir, 'contracts/baselines/carbon.json')).equals(carbonBefore)).toBe(true)

    const compiled = await compilePolicy(parsePolicy(JSON.parse(readFileSync(policyPath, 'utf8'))), dir)
    expect(compiled.ok).toBe(true)
    if (!compiled.ok) return
    expect(git(dir, ['add', '-A']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'propose MUI successor']).status).toBe(0)
    const baseline = JSON.parse(muiBefore.toString()) as ContractArtifact
    const approval = {
      candidateCommit: git(dir, ['rev-parse', 'HEAD']).stdout.trim(),
      oldReviewIdentity: reviewIdentity(baseline),
      newReviewIdentity: reviewIdentity(compiled.artifact),
      verifierSourceHash: decisionHash(dir),
      reviewer: 'independent-reviewer',
      evidence: 'lifecycle fixture',
    }
    const approvalPath = join(tmpdir(), 'designlock-lifecycle-approval.json')
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const activated = run(dir, ['activate', '--contract', 'mui', '--approval', approvalPath])
    expect(activated.status, activated.stdout + activated.stderr).toBe(0)
    expect(readFileSync(join(dir, 'contracts/baselines/carbon.json')).equals(carbonBefore)).toBe(true)
    expect(readFileSync(join(dir, 'contracts/baselines/mui.json')).equals(muiBefore)).toBe(false)
    expect(git(dir, ['add', '-A']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'activate MUI successor']).status).toBe(0)
    approval.candidateCommit = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)

    const enforced = enforce(dir, approvalPath)
    expect(enforced.status, enforced.stdout + enforced.stderr).toBe(0)
    const accepted = run(dir, ['evaluate', '--contract', 'mui', '--fixture', 'contracts/long-button.json'])
    expect(accepted.status, accepted.stdout + accepted.stderr).toBe(0)
    expect(accepted.stdout).toContain('active-baseline')
    const currentActive = readFileSync(activePath)
    writeFileSync(activePath, currentActive.toString().replace('#7b1fa2', '#000000'))
    expect(git(dir, ['add', activePath]).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'tamper active MUI artifact']).status).toBe(0)
    approval.candidateCommit = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const tamperedActive = enforce(dir, approvalPath)
    expect(tamperedActive.status).not.toBe(0)
    expect(tamperedActive.stdout + tamperedActive.stderr).toContain('active contract')
    writeFileSync(activePath, currentActive)
    expect(git(dir, ['add', activePath]).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'restore active MUI artifact']).status).toBe(0)
    approval.candidateCommit = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const muiActivated = readFileSync(join(dir, 'contracts/baselines/mui.json'))
    const carbonPolicy = join(dir, 'contracts/policy/carbon.json')
    writeFileSync(carbonPolicy, readFileSync(carbonPolicy, 'utf8').replace('"maxLength": 80', '"maxLength": 70'))
    const carbonCompiled = await compilePolicy(parsePolicy(JSON.parse(readFileSync(carbonPolicy, 'utf8'))), dir)
    expect(carbonCompiled.ok).toBe(true)
    if (!carbonCompiled.ok) return
    expect(git(dir, ['add', carbonPolicy]).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'propose Carbon successor']).status).toBe(0)
    const carbonBaseline = JSON.parse(carbonBefore.toString()) as ContractArtifact
    writeFileSync(approvalPath, `${JSON.stringify({
      ...approval,
      candidateCommit: git(dir, ['rev-parse', 'HEAD']).stdout.trim(),
      oldReviewIdentity: reviewIdentity(carbonBaseline),
      newReviewIdentity: reviewIdentity(carbonCompiled.artifact),
    }, null, 2)}\n`)
    const carbonActivated = run(dir, ['activate', '--contract', 'carbon', '--approval', approvalPath])
    expect(carbonActivated.status, carbonActivated.stdout + carbonActivated.stderr).toBe(0)
    expect(readFileSync(join(dir, 'contracts/baselines/mui.json')).equals(muiActivated)).toBe(true)
    expect(git(dir, ['add', '-A']).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'activate Carbon successor']).status).toBe(0)
    approval.candidateCommit = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)

    approval.oldReviewIdentity = 'stale'
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const staleCheck = enforce(dir, approvalPath)
    expect(staleCheck.status).not.toBe(0)

    const cliPath = join(dir, 'packages/compiler/src/cli.ts')
    writeFileSync(cliPath, `if (process.argv.includes('--trusted')) process.exit(0)\n${readFileSync(cliPath, 'utf8')}`)
    expect(git(dir, ['add', cliPath]).status).toBe(0)
    expect(git(dir, ['commit', '-m', 'attempt candidate CLI bypass']).status).toBe(0)
    approval.candidateCommit = git(dir, ['rev-parse', 'HEAD']).stdout.trim()
    approval.oldReviewIdentity = reviewIdentity(baseline)
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`)
    const altered = enforce(dir, approvalPath)
    expect(altered.status).not.toBe(0)
    expect(altered.stdout + altered.stderr).toContain('cannot authorize itself')
  }, 180000)
})
