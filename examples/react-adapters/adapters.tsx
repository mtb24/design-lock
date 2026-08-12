import type { DesignSystemAdapter } from '@design-lock/core'
import type { ReactNode } from 'react'
import { carbonAdapter } from './carbon-adapter'
import { muiAdapter } from './mui-adapter'
import type { DemoSystem } from './systems'

export const designSystemAdapters: Record<
  DemoSystem,
  DesignSystemAdapter<ReactNode>
> = {
  mui: muiAdapter,
  carbon: carbonAdapter,
}
