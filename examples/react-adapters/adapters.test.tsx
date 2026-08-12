import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateDesignLock } from '@design-lock/core'
import { designSystemAdapters } from './adapters'

test('Material UI adapter renders a valid contracted card', () => {
  const result = evaluateDesignLock({
    rawResponse: JSON.stringify({
      component: 'Card',
      variant: 'outlined',
      children: [
        { component: 'CardHeader', title: 'Governed UI' },
        {
          component: 'CardActions',
          children: [
            { component: 'Button', children: 'Read more', href: '/docs' },
          ],
        },
      ],
    }),
    mode: 'strict',
    adapter: designSystemAdapters.mui,
  })
  assert.equal(result.validation.valid, true)
  assert.notEqual(result.rendered, null)
})

test('Material UI lenient repair removes unsafe URLs and unknown props', () => {
  const result = evaluateDesignLock({
    rawResponse: JSON.stringify({
      component: 'Button',
      children: 'Unsafe action',
      href: '//attacker.example',
      className: 'fixed inset-0',
    }),
    mode: 'lenient',
    adapter: designSystemAdapters.mui,
  })
  assert.equal(result.validation.valid, false)
  assert.notEqual(result.rendered, null)
  assert.equal((result.renderedTree as Record<string, unknown>).href, undefined)
  assert.equal((result.renderedTree as Record<string, unknown>).className, undefined)
})

test('Carbon adapter renders a valid contracted tile', () => {
  const result = evaluateDesignLock({
    rawResponse: JSON.stringify({
      component: 'Tile',
      title: 'Governed UI',
      body: 'Rendered through Carbon.',
      tags: ['DesignLock'],
    }),
    mode: 'strict',
    adapter: designSystemAdapters.carbon,
  })
  assert.equal(result.validation.valid, true)
  assert.notEqual(result.rendered, null)
})

test('Carbon lenient repair removes unsafe URLs and unknown props', () => {
  const result = evaluateDesignLock({
    rawResponse: JSON.stringify({
      component: 'Tile',
      title: 'Governed UI',
      body: 'Rendered through Carbon.',
      actionLabel: 'Unsafe action',
      actionHref: 'javascript:alert(1)',
      className: 'fixed inset-0',
    }),
    mode: 'lenient',
    adapter: designSystemAdapters.carbon,
  })
  assert.equal(result.validation.valid, false)
  assert.notEqual(result.rendered, null)
  assert.equal(
    (result.renderedTree as Record<string, unknown>).actionHref,
    undefined,
  )
  assert.equal(
    (result.renderedTree as Record<string, unknown>).className,
    undefined,
  )
})
