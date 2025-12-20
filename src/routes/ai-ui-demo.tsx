import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { DS_CONTRACT } from '../design-system'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextInput } from '../ui/TextInput'

export const Route = createFileRoute('/ai-ui-demo')({
  component: AiUiDemo,
})

function AiUiDemo() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>AI + Design System (V0)</h1>

      <Card>
        <div style={{ display: 'grid', gap: 12 }}>
          <TextInput label="Email" required placeholder="name@example.com" />
          <TextInput label="Password" required placeholder="••••••••" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary">Sign in</Button>
            <Button variant="danger">Reset</Button>
          </div>
        </div>
      </Card>

      <details>
        <summary>Design System Contract</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(DS_CONTRACT, null, 2)}
        </pre>
      </details>
    </div>
  )
}