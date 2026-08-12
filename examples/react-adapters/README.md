# React adapter examples

These application-owned adapters demonstrate the same DesignLock core with two
intentionally different component libraries:

- Material UI uses rounded geometry, elevation, and a purple Material theme.
- IBM Carbon uses square geometry, neutral layers, and IBM blue.

The examples are not built into `@design-lock/core` and are not preferred
libraries. They show the boundary an implementer can use for MUI, Carbon, K2DS,
a proprietary design system, or any other component library:

1. Define closed JSON Schemas for the components and props the model may use.
2. Register the schemas by component name.
3. Render accepted component nodes with real library components.
4. Optionally provide deterministic repair or pruning for lenient mode.
5. Test contract validation, safety-policy behavior, and actual rendering.

Run `npm test` at the repository root to execute both adapter examples.
