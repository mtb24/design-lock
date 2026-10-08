import { readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import carbonThemesManifest from '@carbon/themes/package.json'
import muiManifest from '@mui/material/package.json'
import type { TokenPolicy } from './policy.js'
import { portablePath } from './paths.js'

export type TokenRead = {
  family: string
  packageName: string
  packageVersion: string
  theme: string
  sourcePath: string
  values: Record<string, string>
  unresolvedAliases: string[]
}

const packageVersions = {
  '@mui/material': muiManifest.version,
  '@carbon/themes': carbonThemesManifest.version,
} as const

function sortedValues(entries: Array<[string, string]>): Record<string, string> {
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)))
}

function takeString(value: unknown, key: string, values: Array<[string, string]>, unresolved: string[]) {
  if (typeof value !== 'string') return
  if (/^\{[^{}]+\}$/.test(value)) unresolved.push(key)
  else values.push([key, value])
}

async function readMuiPalette(policy: TokenPolicy, repoRoot: string): Promise<TokenRead> {
  const { createTheme } = await import('@mui/material/styles')
  const { pathToFileURL } = await import('node:url')
  const options = policy.source
    ? ((await import(pathToFileURL(join(repoRoot, policy.source)).href)) as { selectedMuiThemeOptions?: object }).selectedMuiThemeOptions
    : undefined
  const theme = createTheme(options)
  const values: Array<[string, string]> = []
  const unresolved: string[] = []
  for (const key of ['primary', 'secondary', 'error', 'warning', 'info', 'success']) {
    const color = theme.palette[key as 'primary']
    takeString(color?.main, key, values, unresolved)
  }
  return {
    family: policy.family,
    packageName: '@mui/material',
    packageVersion: packageVersions['@mui/material'],
    theme: policy.source ? 'selected-mui-theme' : 'createTheme().palette',
    sourcePath: policy.source ?? '@mui/material/styles',
    values: sortedValues(values),
    unresolvedAliases: unresolved.sort(),
  }
}

async function readCarbonTagBackground(family: string): Promise<TokenRead> {
  const tokens = await import('@carbon/themes/js/generated/component-tokens/tag.js')
  const values: Array<[string, string]> = []
  const unresolved: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    if (!key.startsWith('tagBackground') || !value || typeof value !== 'object') continue
    takeString((value as { whiteTheme?: unknown }).whiteTheme, key, values, unresolved)
  }
  return {
    family,
    packageName: '@carbon/themes',
    packageVersion: packageVersions['@carbon/themes'],
    theme: 'white',
    sourcePath: '@carbon/themes/js/generated/component-tokens/tag.js',
    values: sortedValues(values),
    unresolvedAliases: unresolved.sort(),
  }
}

function readFixtureTokens(policy: TokenPolicy, repoRoot: string): TokenRead {
  if (!policy.source) throw new Error(`Token family ${policy.family} is missing a fixture source`)
  const fullPath = isAbsolute(policy.source) ? policy.source : join(repoRoot, policy.source)
  const parsed = JSON.parse(readFileSync(fullPath, 'utf8')) as Record<string, unknown>
  const values: Array<[string, string]> = []
  const unresolved: string[] = []
  for (const [key, value] of Object.entries(parsed)) takeString(value, key, values, unresolved)
  return {
    family: policy.family,
    packageName: 'fixture',
    packageVersion: '0',
    theme: 'fixture',
    sourcePath: portablePath(fullPath, repoRoot),
    values: sortedValues(values),
    unresolvedAliases: unresolved.sort(),
  }
}

export async function readPolicyTokens(policies: TokenPolicy[] | undefined, repoRoot: string): Promise<TokenRead[]> {
  const reads: TokenRead[] = []
  for (const policy of policies ?? []) {
    if (policy.reader === 'mui-palette') reads.push(await readMuiPalette(policy, repoRoot))
    else if (policy.reader === 'carbon-tag-background') reads.push(await readCarbonTagBackground(policy.family))
    else reads.push(readFixtureTokens(policy, repoRoot))
  }
  return reads.sort((left, right) => left.family.localeCompare(right.family))
}
