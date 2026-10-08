import { relative } from 'node:path'

export function portablePath(fileName: string, repoRoot: string): string {
  const normalized = fileName.split('\\').join('/')
  const marker = '/node_modules/'
  const packageStart = normalized.lastIndexOf(marker)
  if (packageStart >= 0) return normalized.slice(packageStart + marker.length)
  const fromRoot = relative(repoRoot, fileName).split('\\').join('/')
  return fromRoot.startsWith('..') ? normalized.slice(normalized.lastIndexOf('/') + 1) : fromRoot
}
