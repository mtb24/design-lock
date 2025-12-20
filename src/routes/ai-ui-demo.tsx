import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { DS_CONTRACT } from '../design-system'
import { validateOutput, ValidationResult } from '../ai/validate'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextInput } from '../ui/TextInput'

export const Route = createFileRoute('/ai-ui-demo')({
  component: AiUiDemo,
})

// Sample TSX outputs for testing validation
const SAMPLE_VALID = `<Card padding="md">
  <TextInput label="Email" type="email" required />
  <Button variant="primary" size="md">Submit</Button>
</Card>`

const SAMPLE_INVALID = `<Card padding="xl">
  <Input label="Name" />
  <Button variant="premium" color="blue">Click</Button>
  <CustomComponent />
</Card>`

function AiUiDemo() {
  // State for validation testing
  const [tsxInput, setTsxInput] = React.useState(SAMPLE_VALID)
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null)

  // Run validation
  const handleValidate = () => {
    const result = validateOutput(tsxInput)
    setValidationResult(result)
  }

  // Load sample outputs
  const loadValid = () => {
    setTsxInput(SAMPLE_VALID)
    setValidationResult(null)
  }

  const loadInvalid = () => {
    setTsxInput(SAMPLE_INVALID)
    setValidationResult(null)
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div>
        <h1 style={{ margin: 0, marginBottom: 8 }}>AI + Design System (V0.1)</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Validate AI-generated JSX against the design system contract
        </p>
      </div>

      {/* Demo: Working Components */}
      <Card>
        <h2 style={{ margin: 0, marginBottom: 16 }}>Example: Login Form</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <TextInput label="Email" required placeholder="name@example.com" />
          <TextInput label="Password" required placeholder="••••••••" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary">Sign in</Button>
            <Button variant="danger">Reset</Button>
          </div>
        </div>
      </Card>

      {/* Validation Testing UI */}
      <Card>
        <h2 style={{ margin: 0, marginBottom: 16 }}>Validation Tester</h2>
        
        {/* Sample buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button variant="secondary" size="sm" onClick={loadValid}>
            Load Valid Sample
          </Button>
          <Button variant="secondary" size="sm" onClick={loadInvalid}>
            Load Invalid Sample
          </Button>
        </div>

        {/* Input textarea */}
        <textarea
          value={tsxInput}
          onChange={(e) => setTsxInput(e.target.value)}
          placeholder="Enter JSX to validate..."
          style={{
            width: '100%',
            minHeight: 150,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 14,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {/* Validate button */}
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={handleValidate}>
            Validate Output
          </Button>
        </div>

        {/* Results panel */}
        {validationResult && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: validationResult.ok ? '#d1fae5' : '#fee2e2',
              border: `2px solid ${validationResult.ok ? '#10b981' : '#ef4444'}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: validationResult.ok ? '#065f46' : '#991b1b',
                marginBottom: 8,
              }}
            >
              {validationResult.ok ? '✅ PASS' : '❌ FAIL'}
            </div>

            {validationResult.ok ? (
              <p style={{ margin: 0, color: '#065f46' }}>
                All checks passed! This output conforms to the design system contract.
              </p>
            ) : (
              <div>
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>
                  Violations:
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#7f1d1d' }}>
                  {validationResult.violations.map((violation, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {violation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Design System Contract Reference */}
      <details>
        <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 8 }}>
          📋 Design System Contract (Click to expand)
        </summary>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 13,
          }}
        >
          {JSON.stringify(DS_CONTRACT, null, 2)}
        </pre>
      </details>
    </div>
  )
}