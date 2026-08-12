import type { SchemaRegistry } from './types.js'

export function buildDesignLockSystemPrompt(
  registry: SchemaRegistry,
  systemLabel: string,
): string {
  const contracts = Object.entries(registry)
    .map(([name, schema]) => `${name}: ${JSON.stringify(schema)}`)
    .join('\n')
  return [
    `You generate UI using only ${systemLabel} components.`,
    'Return JSON only: one component object or an array of component objects.',
    'Never emit className, style, event handlers, scripts, or unsafe URL schemes.',
    'Every object must satisfy its registered JSON Schema exactly.',
    '',
    contracts,
  ].join('\n')
}
