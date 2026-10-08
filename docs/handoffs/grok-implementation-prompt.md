# Grok 4.7 implementation prompt

Paste the following into Grok 4.7 in a coding environment that can read these repositories, edit files, run tests, and inspect a local browser. Attach the plan if that environment cannot read its absolute path.

---

Implement the bounded DesignLock modernization described in:

`/Users/kendowney/Sites/DesignLock/docs/handoffs/designlock-modernization-plan.md`

Read the entire plan before editing. Treat its scope, architecture boundaries, milestone gates, and A01–A16 acceptance matrix as the implementation contract. Do the work, run the checks, review the result, and leave complete usable deliverables. Do not respond with only another plan.

This is Ken Downey's engineering and portfolio project. The purpose is to demonstrate traceable contracts derived from existing component libraries, explicit usage policy, reviewed contract evolution, and reliable enforcement. It is not a startup exercise or a request to build another design system.

Work in `/Users/kendowney/Sites/DesignLock`. Keep `/Users/kendowney/Sites/design-lock` as a read-only reference. Later update the local website at `/Users/kendowney/Sites/kendowney.com`, whose public demonstration lives at `/design-lock`.

First resolve the Git starting point: both DesignLock directories point to `github.com/mtb24/design-lock.git`. At preparation, the intended workspace was at `c969c20`, while remote main and the reference checkout were at `361632e` and already contained the stronger structured-output core. Recheck current state, preserve this handoff and user edits, and start from the verified stronger history in the intended workspace. Do not replace remote main with the obsolete regex prototype. Follow applicable repository instructions and `/Users/kendowney/.codex/guidance/engineering-workflow.md`.

Implement in this order:

1. Preserve the existing core and modes; establish independent adversarial fixtures and baseline test evidence.
2. Prove source-derived extraction for MUI Button and Chip, selected real tokens, explicit policy narrowing, source/version provenance, and unsupported diagnostics.
3. Add Carbon Button and Tag through the same compiler. Implement repeatable generation, freshness checking, semantic/provenance diffs, trusted-baseline comparison, and an explicit reviewed activation procedure.
4. Make kendowney.com's demo consume the exact verified core reproducibly. Show valid, invalid, unsupported, upstream-change, and attempted-policy-expansion scenarios using deterministic fixtures, then verify desktop/mobile behavior and existing site regressions.
5. Complete independent review where available, fix findings, and prepare the exact release artifacts. Preserve the distinction between locally completed work and an updated public website.

Critical constraints:

- Use real TypeScript declarations, resolved imports, and existing tokens. No regex type extraction, invented APIs, manually duplicated upstream enums, or compiler logic that simply returns fixture schemas.
- Preserve correlations in whole prop unions/overloads and record concrete polymorphic/root bindings. Compare against independent TypeScript assignability fixtures; verify accepted values through real DOM/behavior, not merely a non-null React element.
- The policy selects/narrows exposed capabilities. Extraction does not automatically authorize newly discovered capabilities. Model-controlled executable code, arbitrary styling, and unsafe URLs remain blocked.
- Separate derived facts, explicit policy, and adapter compositions. Existing Carbon Tile fields such as title/body/tags are composed model-facing fields, not necessarily actual Tile props.
- Unsupported requested extraction must be visible and unsuccessful. Never turn `any`, unresolved types, or open objects into permissive schemas to get a passing result.
- Keep compiler/filesystem dependencies out of the runtime/browser core. Recheck bounds, schemas, and safety after deterministic repair.
- Compare contract changes with an independently selected trusted baseline. Hashes and candidate-authored “approved” flags are not authorization. Document any enforcement that still depends on human review or repository protection.
- The first compiler/verifier has no trusted predecessor. Use provisional development fixtures, obtain independent review of the seed/verifier, and record their exact identities before claiming independent activation enforcement. Keep this bootstrap status explicit without pausing unrelated local work.
- Keep the website's K2DS, unrelated routes, visual language, provider configuration, and credential boundaries intact. Grok is the implementation model; this does not request a new inference provider for the demo.
- Normal validation must work without paid model calls or production access. Do not add a broad linter, IDE/MCP platform, Figma sync service, commercial features, or additional design systems.

You may make the local code, test, dependency, documentation, and demo changes needed for this scope. Use task branches and preserve unrelated changes. Continue without repeated confirmations for routine implementation choices. This handoff does not itself authorize public pushes/PRs, merges, npm publication, production deployment, paid inference, secrets changes, or repository administration; honor any explicit additional authority Ken supplies in this session. If release authority is missing, finish the local work and produce a concrete reviewable release package before asking for it.

Keep a concise implementation record with decisions, exact test evidence, and remaining work. Run the plan's milestone gates and existing repository checks. Do not weaken requirements, replace behavioral tests with implementation snapshots, or report unrun checks as passing. Request a bounded independent review of extraction soundness, trust boundaries, contract activation, and demo parity if a separate reviewer is available. If unavailable, disclose that clearly and leave independent review outstanding.

Finish with the changed files and revisions, A01–A16 results, supported/unsupported matrix, contract examples, review findings, website integration evidence, and release status. If an external prerequisite is missing, identify the precise blocker and complete all independent work rather than stopping at a proposal.
