export function activeContractPath(name: string): string {
  return `contracts/baselines/${name}.json`
}

export function resolveBaselineText(input: {
  workspaceText: string
  baseText: string | null
  envBaseline?: string
  baseRequested?: boolean
}): { text: string; source: 'base-revision' | 'workspace-provisional' | 'missing-trusted-base' } {
  void input.envBaseline
  if (input.baseRequested) {
    if (input.baseText === null) return { text: '', source: 'missing-trusted-base' }
    return { text: input.baseText, source: 'base-revision' }
  }
  if (input.baseText !== null) return { text: input.baseText, source: 'base-revision' }
  return { text: input.workspaceText, source: 'workspace-provisional' }
}

export function checkExitCode(fresh: boolean, unchangedOrActivated: boolean): number {
  if (!fresh) return 2
  return unchangedOrActivated ? 0 : 3
}
