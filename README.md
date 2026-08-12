# DesignLock

DesignLock is a design-system-agnostic governance layer for AI-generated UI.
It treats model output as untrusted structured data, validates that data against
an implementer-selected component contract, applies safety policies, and only
then hands an accepted tree to the implementer's renderer.

[Try the live Material UI and IBM Carbon comparison](https://kendowney.com/design-lock).

## Why this exists

Prompt instructions can ask a model to use a design system, but they cannot
enforce the result. DesignLock moves that responsibility into code:

- component and prop allowlists are JSON Schemas;
- arbitrary JSX or JavaScript is never evaluated;
- unknown style surfaces, event handlers, and unsafe URLs are blocked;
- response and component-tree size are bounded;
- strict, lenient, and report behavior are explicit;
- rendering belongs to an adapter selected by the implementer.

DesignLock does not ship or prefer a component library. Material UI and Carbon
are deliberately distinct examples. K2DS, another public library, or a
proprietary design system can use the same adapter contract.

## Core usage

```ts
import { evaluateDesignLock, type DesignSystemAdapter } from '@design-lock/core'

const noticeSchema = {
  $id: 'https://example.com/schemas/Notice',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'message'],
  properties: {
    component: { const: 'Notice' },
    message: { type: 'string', minLength: 1, maxLength: 200 },
  },
} as const

const adapter: DesignSystemAdapter<string> = {
  id: 'example',
  label: 'Example components',
  registry: { Notice: noticeSchema },
  schemas: [noticeSchema],
  render: (tree) => JSON.stringify(tree),
}

const result = evaluateDesignLock({
  rawResponse: '{"component":"Notice","message":"Governed UI"}',
  mode: 'strict',
  adapter,
})
```

`result.rendered` is populated only when the selected mode reaches a valid,
policy-safe tree.

## Modes

- `strict`: any schema or policy error blocks rendering.
- `lenient`: the adapter may deterministically repair or prune the tree;
  DesignLock revalidates it before rendering.
- `report`: invalid output is returned for inspection without repair or render.

## Limits and safety policy

The default parser rejects responses over 100,000 characters, more than 32 root
nodes, more than 256 total component nodes, or more than 24 levels of nesting.
Consumers can inject stricter limits.

The default safety policy rejects inline style/class escape hatches, unbound
event-handler props, protocol-relative destinations, and URL schemes outside
HTTP(S), mail, telephone, or relative links. Product integrations should also
bound provider response bytes and request timeouts before calling DesignLock.

## Repository structure

- `src/`: framework- and product-agnostic core.
- `examples/react-adapters/`: real Material UI and IBM Carbon adapter examples.
- `ARCHITECTURE.md`: trust boundaries, modes, and extension model.
- `.github/workflows/quality.yml`: type, test, package, dependency, Fallow, and
  security gates.

## Local verification

```bash
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
npm audit --omit=dev
npm run audit:fallow
npm run audit:security
```

The package is buildable as ESM with declarations and is ready for controlled
publication when a package namespace and release policy are selected. No npm
publication is implied by this repository.

## License

MIT © Ken Downey
