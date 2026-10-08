import type { ContractArtifact, DesignSystemContract } from '@design-lock/core'
import { carbonComponentRegistry, carbonSchemas } from './carbon-contract'
import { muiComponentRegistry, muiSchemas } from './mui-contract'
import carbonGenerated from '../../contracts/baselines/carbon.json'
import muiGenerated from '../../contracts/baselines/mui.json'

export type DemoSystem = 'mui' | 'carbon'

function extractedSchemas(artifact: ContractArtifact) {
  return Object.fromEntries(artifact.semantic.components.map((component) => [component.modelName, component.schema]))
}

const muiExtracted = extractedSchemas(muiGenerated as ContractArtifact)
const carbonExtracted = extractedSchemas(carbonGenerated as ContractArtifact)

export const designSystemContracts: Record<DemoSystem, DesignSystemContract> = {
  mui: {
    id: 'mui',
    label: 'Material UI',
    registry: { ...muiComponentRegistry, ...muiExtracted },
    schemas: [...muiSchemas, ...Object.values(muiExtracted)],
  },
  carbon: {
    id: 'carbon',
    label: 'IBM Carbon',
    registry: { ...carbonComponentRegistry, ...carbonExtracted },
    schemas: [...carbonSchemas, ...Object.values(carbonExtracted)],
  },
}
