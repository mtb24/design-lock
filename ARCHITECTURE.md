# Architecture

```text
model response
      |
      v
@design-lock/core
  parse -> tree limits -> schema contract -> safety policy -> mode decision
      |                         |                         |
      | strict: block          | report: inspect         | lenient
      |                         | without render          v
      +-------------------------+--------------- adapter-owned repair
                                                        |
                                                        v
                                             revalidate -> render

Adapters (outside core)
  implementer-selected component library
    Material UI example: registry + renderer + deterministic repair
    Carbon example: registry + renderer + deterministic repair
    K2DS or any other library: the same adapter contract

Products (outside this repository)
  own provider calls, credentials, request limits, UI, and deployment
```

## Extraction boundary

Installed package exports, TypeScript declarations, and existing token sources
are read by `@design-lock/compiler` at build time. A small policy file selects
components and narrows exposed values. The compiler emits a candidate artifact
with provenance. Comparing that candidate with a baseline and activating a
reviewed version are separate steps. The core can diff and assess activation
without importing the compiler.

The first seed has no trusted predecessor on `origin/main`. Independent review
recorded the seed and verifier identities; `contracts/trust.json` is `reviewed`.
The bootstrap check still binds protected external review evidence to the exact
candidate commit, both seed identities, the verifier, and policy/token inputs.
It is allowed only when the selected base has no trust state or verifier, and
it states that limitation in CI output. After the bootstrap merge, the base
revision's verifier makes this path unavailable.

Normal trusted enforcement executes the decision implementation materialized
from the selected base revision. The GitHub workflow obtains approval JSON from
the protected `design-lock-approval` Environment, writes it under
`$RUNNER_TEMP`, and passes only that path to the same shell entry point exercised
by lifecycle tests. Branch protection and ordinary PR review protect workflow
and environment changes; repository files are not approval authority.

## Trust boundary

Model output is untrusted data. DesignLock parses it as JSON, enforces bounded
tree structure, validates each node against the selected adapter's closed JSON
Schemas, applies default safety policies, and renders only an accepted tree.
It never evaluates generated JavaScript or JSX.

The core owns no React components, design tokens, provider credentials, network
requests, application routes, or product data. Those concerns belong to the
implementer and its adapter or product integration.

## Modes

- **Strict** renders only the original valid tree.
- **Lenient** lets the adapter deterministically repair or prune the tree, then
  requires a second contract and policy pass before render.
- **Report** returns findings for inspection and does not render invalid output.

## Adapter boundary

An adapter supplies an identifier, label, component registry, JSON Schemas,
renderer, and optional deterministic lenient preparer. DesignLock does not
prescribe, bundle, or rank component libraries. Selection and adapter ownership
belong to the implementer.

For clean-checkout typechecking, the repository TypeScript configuration maps
the example workspace's `@design-lock/core` self-reference to `src/index.ts`.
Executable adapter tests build and resolve the package's real `dist` export.

## Defense in depth

Default parsing limits are 100,000 response characters, 32 root nodes, 256 total
component nodes, and 24 levels of nesting. Default policy blocks unknown inline
style surfaces, unbound event handlers, protocol-relative destinations, and URL
schemes outside HTTP(S), mail, telephone, or relative links.

Products must also bound provider responses and timeouts before passing model
text into DesignLock. The live demo follows that outer-boundary pattern.
