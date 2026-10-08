import ts from 'typescript'
import type { ExtractionPolicy } from './policy.js'

const VIRTUAL_FILE = '.designlock-extract.tsx'

function extractOptions(repoRoot: string): ts.CompilerOptions {
  return {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    skipLibCheck: true,
    baseUrl: repoRoot,
  }
}

function importLine(kind: 'named' | 'default', exportName: string, moduleName: string, local: string) {
  if (kind === 'default') return `import ${local} from ${JSON.stringify(moduleName)}`
  return `import { ${exportName} as ${local} } from ${JSON.stringify(moduleName)}`
}

export function extractSource(policy: ExtractionPolicy): string {
  const lines = [`import React from 'react'`]
  policy.components.forEach((component, index) => {
    const local = `__cmp${index}`
    lines.push(importLine(component.importKind, component.exportName, component.module, local))
    lines.push(`export const cmp${index} = ${local}`)
    lines.push(`export type Props${index} = React.ComponentProps<typeof ${local}>`)
    lines.push(`export type Params${index} = Parameters<typeof ${local}>[0]`)
    if (component.branch) {
      const local = `__branch${index}`
      lines.push(`import { type ${component.branch.exportName} as ${local} } from ${JSON.stringify(component.branch.module)}`)
      lines.push(`export type Branch${index} = ${local}`)
    }
  })
  return lines.join('\n')
}

export function createExtractProgram(repoRoot: string, source: string) {
  const virtual = `${repoRoot}/${VIRTUAL_FILE}`
  const options = extractOptions(repoRoot)
  const host = ts.createCompilerHost(options, true)
  const originalGet = host.getSourceFile.bind(host)
  const originalExists = host.fileExists.bind(host)
  host.fileExists = (fileName) => fileName === virtual || originalExists(fileName)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (fileName === virtual) return ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TSX)
    return originalGet(fileName, languageVersion, onError, shouldCreate)
  }
  const program = ts.createProgram([virtual], options, host)
  return { program, sourceFile: program.getSourceFile(virtual) }
}
