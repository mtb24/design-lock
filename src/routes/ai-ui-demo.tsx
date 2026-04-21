import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { DS_CONTRACT } from '../design-system'
import { validateOutput, ValidationResult } from '../ai/validate'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export const Route = createFileRoute('/ai-ui-demo')({
  component: AiUiDemo,
})

// Sample TSX outputs for testing validation
const SAMPLE_VALID = `<Card padding="md">
  <TextInput label="Email" required />
  <Button variant="primary" size="md">Submit</Button>
</Card>`

// Invalid: wrong enum values and invalid props
const SAMPLE_INVALID = `<Card padding="xl">
  <Button variant="premium" color="blue">Click</Button>
</Card>`

// Invalid: disallowed components
const SAMPLE_INVALID_COMPONENT = `<Card padding="md">
  <Input label="Username" />
  <CustomComponent />
  <Button variant="primary">Submit</Button>
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

  const loadInvalidComponent = () => {
    setTsxInput(SAMPLE_INVALID_COMPONENT)
    setValidationResult(null)
  }

  // V0.2 demo fix: Simple auto-fix that normalizes Button variant to "primary"
  // This is a minimal proof-of-concept for iterative fixing without LLM calls
  const handleAutoFix = () => {
    // Fix: Replace any Button variant value with "primary"
    const fixed = tsxInput.replace(
      /<Button\s+([^>]*)\bvariant="[^"]*"([^>]*)>/g,
      '<Button $1variant="primary"$2>'
    )
    
    // Update textarea with fixed content
    setTsxInput(fixed)
    
    // Immediately re-validate to show updated results
    const result = validateOutput(fixed)
    setValidationResult(result)
  }

  return (
    <>
      <style>{`
        .two-column-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .two-column-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ padding: 24, display: 'grid', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 8 }}>AI + Design System (V0.2)</h1>
          <p style={{ margin: 0, marginBottom: 16, color: '#6b7280' }}>
            Validate AI-generated JSX against the design system contract
          </p>

          {/* Demo Mode Control Strip */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: 12,
              backgroundColor: '#f9fafb',
              border: '2px solid #e5e7eb',
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', alignSelf: 'center', marginRight: 8 }}>
              Demo Mode:
            </div>
            <Button variant="danger" size="sm" onClick={loadInvalid}>
              Load Invalid
            </Button>
            <Button variant="primary" size="sm" onClick={handleValidate}>
              Validate
            </Button>
            {validationResult && !validationResult.ok && (
              <Button variant="danger" size="sm" onClick={handleAutoFix}>
                Auto-fix
              </Button>
            )}
          </div>
        </div>

        {/* Two-column layout for Validation Tester and Design System Contract */}
        <div className="two-column-layout">
        {/* Validation Testing UI */}
        <Card>
          <h2 style={{ margin: 0, marginBottom: 16 }}>Validation Tester</h2>
          
          {/* Sample buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm" onClick={loadValid}>
              Load Valid Sample
            </Button>
            <Button variant="danger" size="sm" onClick={loadInvalid}>
              Load Invalid (props)
            </Button>
            <Button variant="danger" size="sm" onClick={loadInvalidComponent}>
              Load Invalid (component)
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
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={handleValidate}>
              Validate Output
            </Button>
            
            {/* V0.2 Auto-fix button - only show when validation failed */}
            {validationResult && !validationResult.ok && (
              <Button variant="danger" onClick={handleAutoFix}>
                Auto-fix (V0.2)
              </Button>
            )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: '#991b1b' }}>
                      Violations:
                    </div>
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
        <Card>
          <h2 style={{ margin: 0, marginBottom: 16 }}>📋 Design System Contract</h2>
          <div
            style={{
              maxHeight: 'calc(100vh - 300px)',
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                backgroundColor: '#1f2937',
                color: '#f9fafb',
                padding: 16,
                borderRadius: 4,
                margin: 0,
                fontSize: 13,
              }}
            >
              {JSON.stringify(DS_CONTRACT, null, 2)}
            </pre>
          </div>
        </Card>
        </div>
      </div>
    </>
  )
}