import type { DesignSystemContract } from '@design-lock/core'
import { carbonComponentRegistry, carbonSchemas } from './carbon-contract'
import { muiComponentRegistry, muiSchemas } from './mui-contract'

export type DemoSystem = 'mui' | 'carbon'

export const designSystemContracts: Record<DemoSystem, DesignSystemContract> = {
  mui: {
    id: 'mui',
    label: 'Material UI',
    registry: muiComponentRegistry,
    schemas: muiSchemas,
  },
  carbon: {
    id: 'carbon',
    label: 'IBM Carbon',
    registry: carbonComponentRegistry,
    schemas: carbonSchemas,
  },
}
