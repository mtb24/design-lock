import assert from 'node:assert/strict'
import type { ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Window } from 'happy-dom'
import { evaluateDesignLock } from '@design-lock/core'
import { designSystemAdapters } from './adapters'
import {
  acceptedCarbonButton,
  acceptedCarbonTag,
  acceptedMuiButton,
  acceptedMuiChip,
  neonIsNotAMuiButtonColor,
  outlineRemainsAnUpstreamTagType,
} from './extracted-types'

function installDom() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const window = new Window({ url: 'https://design-lock.local/' })
  const globals = {
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    DocumentFragment: window.DocumentFragment,
    Element: window.Element,
    SVGElement: window.SVGElement,
    getComputedStyle: window.getComputedStyle.bind(window),
  }
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  const style = window.document.createElement('style')
  style.textContent = readFileSync(new URL('../../node_modules/@carbon/styles/css/styles.css', import.meta.url), 'utf8')
  window.document.head.appendChild(style)
  return window
}

function matchesColor(actual: string, hex: string): boolean {
  const value = actual.trim().toLowerCase()
  if (value === hex) return true
  const channels = hex
    .slice(1)
    .match(/../g)
    ?.map((part) => Number.parseInt(part, 16))
  return value === `rgb(${channels?.join(', ')})`
}

async function render(node: ReactNode) {
  const React = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { act } = await import('react')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(node)
  })
  return host
}

test('accepted MUI values reach Button and Chip behavior', async () => {
  assert.equal(neonIsNotAMuiButtonColor, true)
  assert.equal(outlineRemainsAnUpstreamTagType, true)
  installDom()
  for (const [component, props] of [
    ['Button', acceptedMuiButton],
    ['Chip', acceptedMuiChip],
  ] as const) {
    const result = evaluateDesignLock({
      rawResponse: JSON.stringify({ component, ...props }),
      mode: 'strict',
      adapter: designSystemAdapters.mui,
    })
    assert.equal(result.validation.valid, true, JSON.stringify(result.validation.errors))
    assert.equal(result.blocked, false)
  }
  const React = await import('react')
  const disabledButtonResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Button', ...acceptedMuiButton }),
    mode: 'strict',
    adapter: designSystemAdapters.mui,
  })
  const enabledButtonResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Button', ...acceptedMuiButton, disabled: false }),
    mode: 'strict',
    adapter: designSystemAdapters.mui,
  })
  const chipResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Chip', ...acceptedMuiChip }),
    mode: 'strict',
    adapter: designSystemAdapters.mui,
  })
  const host = await render(
    React.createElement('div', null, disabledButtonResult.rendered, enabledButtonResult.rendered, chipResult.rendered),
  )
  const [disabledButton, enabledButton] = Array.from(host.querySelectorAll('button'))
  const chip = host.querySelector('.MuiChip-label')
  assert.equal(disabledButton?.textContent, 'Save')
  assert.equal(disabledButton?.hasAttribute('disabled'), true)
  assert.match(disabledButton?.className ?? '', /MuiButton-contained/)
  assert.match(disabledButton?.className ?? '', /MuiButton-colorPrimary/)
  assert.match(disabledButton?.className ?? '', /Mui-disabled/)
  assert.equal(chip?.textContent, 'Ready')
  assert.match(host.querySelector('.MuiChip-root')?.className ?? '', /MuiChip-outlined/)
  assert.match(host.querySelector('.MuiChip-root')?.className ?? '', /Mui-disabled/)
  assert.equal(matchesColor(getComputedStyle(enabledButton as Element).backgroundColor, '#7b1fa2'), true)
})

test('rejected input does not invoke the renderer', () => {
  let calls = 0
  const adapter = {
    ...designSystemAdapters.mui,
    render(tree: Parameters<typeof designSystemAdapters.mui.render>[0]) {
      calls += 1
      return designSystemAdapters.mui.render(tree)
    },
  }
  const result = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Button', children: 'Save', color: 'neon' }),
    mode: 'strict',
    adapter,
  })
  assert.equal(result.rendered, null)
  assert.equal(calls, 0)
})

test('accepted Carbon values reach Button and Tag behavior', async () => {
  installDom()
  for (const [component, props] of [
    ['Button', acceptedCarbonButton],
    ['Tag', acceptedCarbonTag],
  ] as const) {
    const result = evaluateDesignLock({
      rawResponse: JSON.stringify({ component, ...props }),
      mode: 'strict',
      adapter: designSystemAdapters.carbon,
    })
    assert.equal(result.validation.valid, true, JSON.stringify(result.validation.errors))
  }
  const React = await import('react')
  const buttonResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Button', ...acceptedCarbonButton }),
    mode: 'strict',
    adapter: designSystemAdapters.carbon,
  })
  const disabledTagResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Tag', ...acceptedCarbonTag }),
    mode: 'strict',
    adapter: designSystemAdapters.carbon,
  })
  const enabledTagResult = evaluateDesignLock({
    rawResponse: JSON.stringify({ component: 'Tag', ...acceptedCarbonTag, disabled: false }),
    mode: 'strict',
    adapter: designSystemAdapters.carbon,
  })
  const host = await render(React.createElement('div', null, buttonResult.rendered, disabledTagResult.rendered, enabledTagResult.rendered))
  const button = host.querySelector('button')
  const [disabledTag, enabledTag] = Array.from(host.querySelectorAll('.cds--tag'))
  assert.equal(button?.textContent, 'Continue')
  assert.equal(button?.hasAttribute('disabled'), true)
  assert.match(button?.className ?? '', /cds--btn--danger/)
  assert.equal(disabledTag?.textContent, 'Beta')
  assert.match(disabledTag?.className ?? '', /cds--tag--blue/)
  assert.match(disabledTag?.className ?? '', /cds--tag--disabled/)
  assert.match(enabledTag?.className ?? '', /cds--tag--blue/)
  assert.equal(matchesColor(getComputedStyle(enabledTag as Element).backgroundColor, '#d0e2ff'), true)
})
