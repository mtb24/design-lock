# DesignLock

DesignLock is a design-system-agnostic trust boundary for AI-generated UI. It
treats model output as untrusted structured data, validates that data against an
implementer-selected component contract, applies safety policies, and only then
hands an accepted tree to the implementer's renderer.

[Try the live Material UI and IBM Carbon comparison](https://kendowney.com/design-lock).

## Why this exists

Prompt instructions can ask a model to use a design system, but they cannot
enforce the result. DesignLock moves that responsibility into deterministic
application code:

- component and prop allowlists are closed JSON Schemas;
- arbitrary JSX or JavaScript is never evaluated;
- unknown style surfaces, event handlers, and unsafe URLs are blocked;
- response and component-tree size are bounded;
- strict, lenient, and report behavior are explicit;
- rendering belongs to an adapter selected by the implementer.

DesignLock does not ship or prefer a component library. Material UI and Carbon
are deliberately distinct examples. K2DS, another public library, a proprietary
design system, Web Components, or a non-React renderer can use the same adapter
contract.

## How it works

```text
model response
      |
      v
parse JSON -> enforce tree limits -> validate schemas -> apply safety policy
                                                               |
                          +------------------------------------+
                          |
             strict/report: block invalid output
                          |
             lenient: adapter-owned deterministic repair
                          |
                          v
                 revalidate -> trusted render
```

The model proposes a JSON component tree. It never chooses executable code or
imports. A tree might look like this:

```json
{
  "component": "Notice",
  "message": "Your changes were saved",
  "tone": "success"
}
```

The implementer decides whether `Notice` exists, which properties and values it
accepts, how it may be composed, and how an accepted node maps to a real
component.

### Responsibility boundary

| DesignLock owns | The implementer owns |
| --- | --- |
| Parsing untrusted model text | Choosing the model and component library |
| Response and tree limits | Provider calls, credentials, byte limits, and timeouts |
| JSON Schema validation | Defining the allowed component contract |
| Common safety policies | Mapping accepted nodes to real components |
| Mode and block decisions | Product actions, URLs, application data, and deployment |
| Revalidation after lenient repair | The optional deterministic repair rules |

The core owns no React components, design tokens, model-provider integration,
network requests, product routes, or application data.

## Core usage

The package is prepared as `@design-lock/core`, but is not currently published
to npm. Until a package namespace and release policy are selected, consumers can
clone or vendor this repository, build it, and install the archive produced by
`npm pack`. The repository is not claiming that `npm install @design-lock/core`
is available yet.

Create a closed schema for each component that the model may request:

```ts
import {
  buildDesignLockSystemPrompt,
  evaluateDesignLock,
  type DesignSystemAdapter,
} from '@design-lock/core'

const noticeSchema = {
  $id: 'https://example.com/schemas/Notice',
  type: 'object',
  additionalProperties: false,
  required: ['component', 'message'],
  properties: {
    component: { const: 'Notice' },
    message: { type: 'string', minLength: 1, maxLength: 200 },
    tone: {
      type: 'string',
      enum: ['info', 'success', 'warning', 'error'],
    },
  },
} as const

const adapter: DesignSystemAdapter<string> = {
  id: 'example',
  label: 'Example components',
  registry: { Notice: noticeSchema },
  schemas: [noticeSchema],
  render: (tree) => JSON.stringify(tree),
}

const systemPrompt = buildDesignLockSystemPrompt(
  adapter.registry,
  adapter.label,
)

// The application calls its chosen model provider with systemPrompt.
const rawResponse =
  '{"component":"Notice","message":"Governed UI","tone":"success"}'

const result = evaluateDesignLock({
  rawResponse,
  mode: 'strict',
  adapter,
})

if (!result.blocked) {
  // Insert result.rendered into the application through its trusted UI path.
}
```

`buildDesignLockSystemPrompt` helps the model follow the selected registry, but
the prompt is not the enforcement boundary. Enforcement happens after the model
responds.

### Building a production adapter

1. Choose a small, safe subset of real components to expose.
2. Write one JSON Schema per component with `additionalProperties: false`,
   explicit required properties, bounded strings and arrays, and enumerated
   variants or tokens.
3. Express valid child composition with schema references rather than accepting
   arbitrary nested components.
4. Implement `render` by mapping accepted names and properties to trusted,
   imported components.
5. Optionally implement `prepareLenient` using deterministic code that removes,
   normalizes, or prunes invalid data.
6. Give the registry to the model, evaluate its raw response, and render only
   when `result.blocked === false`.

The React examples show the complete boundary for two real and visually distinct
component libraries:

- [`mui-contract.ts`](examples/react-adapters/mui-contract.ts) and
  [`mui-adapter.tsx`](examples/react-adapters/mui-adapter.tsx)
- [`carbon-contract.ts`](examples/react-adapters/carbon-contract.ts) and
  [`carbon-adapter.tsx`](examples/react-adapters/carbon-adapter.tsx)

The core is generic over the adapter's rendered result, so `render` may return a
React node, another framework's representation, serialized markup, or another
trusted application-specific value.

### Safe application actions

Model output cannot contain functions or event handlers such as `onClick`.
Interactive applications should expose symbolic action identifiers in their
schema and map those identifiers to trusted callbacks inside the adapter:

```json
{
  "component": "Button",
  "label": "Open settings",
  "action": "open-settings"
}
```

The adapter can map `open-settings` to a callback already owned by the
application. The model never supplies executable behavior.

## Modes and result semantics

- `strict`: any schema or policy error blocks rendering. This is the recommended
  production default.
- `lenient`: the adapter may deterministically repair or prune the tree;
  DesignLock revalidates the result against both the schema and safety policy
  before rendering.
- `report`: invalid output and its findings are returned for inspection without
  repair or render. Valid output still renders.

The evaluation result contains:

```ts
type DesignLockEvaluation<TRendered> = {
  adapterId: string
  parse: { tree: DesignLockNode | DesignLockNode[] | null; parseError?: string }
  validation: { valid: boolean; errors: DesignLockIssue[]; warnings: DesignLockWarning[] }
  rendered: TRendered | null
  renderedTree: DesignLockNode | DesignLockNode[] | null
  blocked: boolean
  renderNote?: string
}
```

Use `blocked` as the final allow/render authority. In lenient mode, `validation`
describes the original response while `renderedTree` contains the repaired and
revalidated tree. The original validation may therefore contain errors even
when `blocked` is `false`. Parse failures are reported in `parse.parseError`.

## Limits and safety policy

The default parser rejects responses over 100,000 characters, more than 32 root
nodes, more than 256 total component nodes, or more than 24 levels of nesting.
Consumers can inject stricter limits.

The default safety policy rejects inline `style` and `className` escape hatches,
unbound event-handler properties, protocol-relative destinations, and URL
schemes outside HTTP(S), mail, telephone, or relative links. Plain HTTP produces
a warning. Applications with stricter destination requirements should constrain
URLs further in their contract and trusted integration.

Products should also bound provider response bytes and request timeouts before
calling DesignLock. The live demo follows that outer-boundary pattern.

## What is deterministic

Given the same raw response, adapter, mode, schemas, repair function, and limits,
DesignLock's parsing, limit enforcement, validation, policy findings, mode
decision, repair revalidation, and accepted tree are deterministic.

The following remain outside that guarantee:

- what the model generates;
- provider retries, latency, and failures;
- whether the implementer's schema accurately represents its design system;
- application callbacks, network state, and runtime component behavior;
- user interaction, responsive layout, and other browser-dependent behavior.

DesignLock can deterministically enforce a weak contract. Deterministic does not
automatically mean correct: contract quality and trusted adapter behavior remain
the implementer's responsibility.

## Recommended integration tests

At minimum, test that:

- a valid tree renders through real components;
- unknown components are blocked;
- missing, additional, and invalid properties are blocked;
- inline styles, event handlers, and unsafe URLs are blocked;
- tree depth, node count, root count, and response length limits are enforced;
- lenient repair is deterministic and cannot bypass revalidation;
- no render path consumes the raw model response directly.

The repository covers the core evaluator in [`src/engine.test.ts`](src/engine.test.ts)
and exercises real React adapters in
[`examples/react-adapters/adapters.test.tsx`](examples/react-adapters/adapters.test.tsx).

## Repository structure

- `src/types.ts`: public node, contract, adapter, mode, and result types.
- `src/parse.ts`: JSON extraction, structural parsing, and tree limits.
- `src/validate.ts`: AJV-backed component-contract validation.
- `src/policies.ts`: design-system-independent safety rules.
- `src/engine.ts`: parse, validate, policy, repair, revalidate, and render flow.
- `src/prompt.ts`: optional model instruction builder.
- `examples/react-adapters/`: real Material UI and IBM Carbon integrations.
- `ARCHITECTURE.md`: concise trust boundaries and extension model.
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

The package is buildable as ESM with TypeScript declarations and has AJV as its
only runtime dependency. It is ready for controlled publication when a package
namespace and release policy are selected. No npm publication is implied by
this repository.

## License

MIT © Ken Downey
