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

## Defense in depth

Default parsing limits are 100,000 response characters, 32 root nodes, 256 total
component nodes, and 24 levels of nesting. Default policy blocks unknown inline
style surfaces, unbound event handlers, protocol-relative destinations, and URL
schemes outside HTTP(S), mail, telephone, or relative links.

Products must also bound provider responses and timeouts before passing model
text into DesignLock. The live demo follows that outer-boundary pattern.
