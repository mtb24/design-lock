# DesignLock modernization: implementation contract

Prepared for Ken Downey and the implementing agent on 2026-09-23.

## Outcome and scope

Modernize DesignLock as an engineering and portfolio project. Demonstrate a bounded, traceable path from existing React libraries and tokens to enforceable contracts for model-generated UI. Success means correct behavior, repeatable evidence, understandable limitations, and an updated kendowney.com demonstration. Commercial positioning, customer discovery, and feature parity with every competing tool are outside this project.

The implementation has four deliverables:

1. Preserve and strengthen the existing structured-output enforcement core.
2. Generate contracts for a small real Material UI subset, with provenance and explicit unsupported cases.
3. Prove the architecture with IBM Carbon and reviewable contract evolution.
4. Integrate the verified implementation into the kendowney.com demo and prepare its release.

This document authorizes no action by itself. When Ken supplies the accompanying implementation prompt as a work request, it authorizes local implementation and verification in the stated repositories. Carry forward any additional authority Ken supplies in that session. Public publishing, merging, production deployment, credential changes, paid inference, and repository administration require existing explicit authority; do all authorized local work before requesting any missing release approval.

## Verified starting point — recheck before edits

| Location | Observed state | Role |
| --- | --- | --- |
| `/Users/kendowney/Sites/DesignLock` | Clean `main`, `c969c20134e98f683ec7468260846b85ae658708`; regex JSX prototype and illustrative Figma sync | Ken's intended implementation workspace |
| `/Users/kendowney/Sites/design-lock` | Clean `main`, `361632e0843423f51f7824f354a36062d8194e52`; `@design-lock/core`, JSON Schema validation, MUI/Carbon examples | Read-only reference checkout |
| `/Users/kendowney/Sites/kendowney.com` | Clean `main`, `e04a5435bdf89cbb4af8a4eeab4eabea1d161c0f`; TanStack Start site | Demo consumer and later release target |

**The two DesignLock directories point to the same remote, `github.com/mtb24/design-lock.git`.** A read-only remote check on the preparation date returned `361632e0843423f51f7824f354a36062d8194e52` for remote `main`. The intended workspace is behind that remote; the words “newer repo” describe Ken's chosen workspace, not the checked-out Git history. Do not overwrite the stronger remote implementation with the old prototype or create a competing repository.

Start by inspecting status, worktrees, remotes, history, and repository instructions. Preserve this handoff and any user changes. Fetch and compare the current remote, then preferably create a task branch in `DesignLock` from the verified remote `main`, which already contains the stronger core. Keep the reference checkout unchanged. If the graph has changed, reconcile it without resets or force pushes. Use a `feature/` branch by default; honor applicable repository branch conventions.

The website has another authored core at `packages/design-lock` and imports it as `@design-lock/core`. Its relevant files are:

- `app/routes/design-lock.tsx`: public `/design-lock` page.
- `app/design-lock/`: application-owned contracts, renderers, and adapter tests.
- `app/server/generateUI.ts` and its tests: existing bounded provider integration.
- `tests/browser/design-lock.spec.ts` and `playwright.config.ts`: desktop/mobile tests and fixture-capable local server.
- `.github/workflows/design-lock-quality.yml`: existing project gates.
- `docs/design-lock-architecture.md`, `README.md`, and the deployment section of `CLAUDE.md`: current architecture and operational references.

Read applicable `AGENTS.md` files and `/Users/kendowney/.codex/guidance/engineering-workflow.md`. The website README currently points to `CLAUDE.md` for deployment facts; consult those facts without introducing a model-specific instruction system. Preserve K2DS, unrelated routes, site styling, provider credentials/configuration, and production services.

## Architecture and responsibility boundaries

```text
installed package exports + TypeScript declarations + existing theme/token source
                                  |
                       build-time extraction
                                  |
                  source facts + provenance + coverage
                                  |
                    small authored policy overlay
                                  |
                     generated candidate contract
                                  |
              compare with reviewed baseline / report changes
                                  |
                   explicitly selected active contract
                                  |
untrusted JSON -> bounded parsing -> schema + safety checks -> mode decision
                                                              |
                                    optional deterministic adapter repair
                                                              |
                               recheck bounds + schema + safety -> renderer
```

- **Core:** validation and evaluation only. Keep the existing `@design-lock/core` identity. No React, component-library, provider, filesystem, network, or TypeScript-compiler imports in its browser runtime path.
- **Compiler:** a separate Node/build entry point or package. Use TypeScript's parser/type checker and real module resolution. It discovers facts; it grants no permission by itself. Choose the smallest packaging change that enforces this boundary.
- **Policy:** explicitly selects components and exposed props, narrows allowed values, specifies permitted children, and supplies bounds. References existing token keys. It must not reproduce every upstream prop definition or manufacture a token to satisfy output.
- **Adapters:** trusted application code maps the closed vocabulary to actual imported components. Fixed props, callbacks, compositions, and rendering decisions belong here and carry authored provenance.
- **Website:** imports or reproducibly consumes the canonical core and approved contracts. It owns presentation and existing provider integration.

This is a governed JSON-rendering project. A general JSX/TSX linter, ESLint plugin, IDE hook framework, MCP server, Figma synchronization service, universal TypeScript-to-schema compiler, SaaS dashboard, and additional component libraries are deferred. Retire or clearly label the regex demo and mock Figma path; they cannot be presented as production enforcement or live synchronization.

## What is derived and what remains authored

| Fact or rule | Authority |
| --- | --- |
| Component identity, export, import origin | Resolved installed package/workspace declarations |
| Selected primitive prop types, literal values, requiredness | Type checker, using the documented supported subset |
| Token keys and values | Existing library theme or project token source |
| Which supported capabilities model output may access | Reviewed policy overlay |
| Text length, array length, child composition restrictions | Explicit policy, labeled as policy rather than inferred library requirements |
| Model field mapped to several real components | Authored adapter composition, with mappings and tests |
| Example states and visual expectations | Real stories/fixtures; examples do not prove exhaustive API semantics |

For example, the existing Carbon `Tile` model vocabulary includes `title`, `body`, `tags`, and `actionHref`; those are adapter-composition fields, not automatically Carbon Tile props. Do not label them as extracted from Carbon declarations. Likewise, a hand-picked subset of MUI variants is policy narrowing, not the full upstream type.

Functions, refs, arbitrary styles, React elements, slots, polymorphic component selectors, and open-ended prop bags are not automatically safe because the library supports them. Exclude them explicitly or bind them in trusted adapters. If an excluded prop is required upstream, supply a type-checked application-owned binding or reject that exposed component. Do not erase requiredness to make extraction work.

### Bounded initial extraction

Start with **MUI Button and Chip**. After that vertical slice passes, add **Carbon Button and Tag** using the same compiler. This is the minimum four-component scope. Add a third component per library only if needed for the existing demonstration; it is not a prerequisite for completing the four-component milestone.

Support selected JSON-serializable primitives, finite literal unions, optional versus required props, and bounded arrays/objects where needed. Follow aliases, imports/re-exports, and resolvable intersections with the type checker. Handle a generic or conditional type only when it resolves to a concrete supported selected type. `any`, `unknown`, unbounded index signatures, unresolved generics, and unresolved conditionals must never become permissive `{}` schemas or broad strings just to finish compilation.

Preserve correlations across whole prop shapes. Do not flatten an object union or overload into independent per-prop enums that permit combinations no upstream branch accepts. Record the concrete default/root/generic binding used by polymorphic components. For Carbon Tag in particular, inspect the installed declaration's multiple tag shapes; either preserve their relationships or explicitly select a supported branch through a type-checked adapter binding. Expose ambiguous shapes as unsupported. Maintain positive and negative TypeScript assignability fixtures for the same complete prop objects accepted or rejected by the generated schema. Include `{ mode: "text"; value: string } | { mode: "count"; value: number }`: the mismatched pair `{ mode: "text", value: 7 }` must fail even though each isolated value appears in the union.

Record excluded and unsupported fields separately. An intentionally excluded optional callback need not block the supported subset. A requested exposed field that cannot be represented faithfully makes that candidate contract unusable; emit diagnostics and exit unsuccessfully. A policy-authored narrower representation such as text-only children must be labeled as such and checked against the upstream API.

Use real installed versions with a lockfile. Avoid opportunistic major upgrades. Extract tokens from existing sources; a small adapter can select a theme or read an existing source. It may not duplicate the library's token values into a second handwritten catalog. Record theme identity and unresolved aliases. Demonstrate at least one real token family from each library and one invalid-token rejection in an exposed token-backed field. Map accepted token references through a trusted binding, not arbitrary model-controlled CSS. Use a direct library prop where appropriate or a clearly labeled adapter field where the library has no such prop. Do not imply every component prop consumes tokens.

Never evaluate model-provided code, arbitrary user configuration, or unknown modules to extract types. Any execution of installed library theme helpers must be an explicit trusted build-time adapter with a documented package/version boundary.

### Artifact and provenance requirements

Define a versioned machine-readable artifact containing:

- Package name and exact version; component export/import identity.
- Selected effective schemas and policy identifier/hash.
- Source declarations or token paths, symbol names, and content hashes for derived facts; authored-rule references for policy and adapter fields.
- Coverage entries distinguishing derived, policy-authored, adapter-authored, intentionally excluded, and unsupported fields.
- Compiler version/options identity and relevant dependency/theme fingerprints.
- A canonical semantic hash and a separate provenance/inputs identity where appropriate.

Use stable ordering and package-relative or repository-relative paths. Machine-specific absolute paths and timestamps must not make semantic output differ. Identical inputs must generate identical canonical artifacts in clean checkouts. Do not call a hash an approval, signature, or proof of source authenticity.

## Runtime semantics to preserve

Preserve the reference engine's bounded parsing, closed component schemas, safety checks, strict/report/lenient behavior, and adapter-owned rendering. Preserve `blocked` as final rendering authority and document any deliberately versioned API change.

- Strict: invalid input does not render.
- Report: invalid input is inspectable but does not render; valid input retains existing rendering behavior.
- Lenient: only deterministic adapter repairs are allowed. Recheck size/tree bounds, schemas, and safety after repair; a repair cannot smuggle a larger or unsafe tree through the gate.
- Preserve original findings separately from the repaired tree and its verification outcome.
- Invalid and unsupported/unverifiable are distinct explanations; neither authorizes rendering. A supported subset may render only under its explicit closed contract.
- Preserve rejection of unknown components/props, unsafe URL variants, model-owned styles/classes, executable event handlers, and malformed or oversized trees. Render only trusted component identities; never execute raw JSX/JavaScript.

Do not infer correct accessibility, visual design, or product intent merely from schema validity. Verify the demo states separately and describe the boundaries accurately.

## Contract evolution and trusted baselines

Separate three operations: generate a candidate, inspect its difference, and activate an explicitly reviewed version. Generating a manifest must never silently promote it to the active authority.

Provide repeatable commands for generation, freshness verification, semantic diffing, and evaluation; choose names consistent with the repository and document them. Checks must return meaningful nonzero exits for invalid output, requested unsupported extraction, stale artifacts, or unaccepted effective-contract changes. Read-only verification commands must not rewrite artifacts or approve changes.

Compare candidate contracts with an independently selected baseline from a trusted base revision or separately supplied approved artifact. Do not let candidate code choose its own baseline through an untrusted filename or environment override. Report:

- Expanded permission: newly exposed component/prop/value/token, relaxed requiredness or bounds.
- Restricted permission: removed value/field/component, newly required prop, tighter bounds.
- Mixed or unclassifiable changes: explicitly require review rather than guessing compatibility.
- Provenance-only changes separately from effective permission changes.
- Token value/theme changes even when keys are unchanged; unchanged schema can still change pixels.

A changed source declaration may legitimately produce a candidate change. It becomes active through an explicit reviewed update, never by calling generation an approval. Model mutation of an artifact, policy, baseline file, package version, or verifier must not be reported as having bypass-proof approval. In CI, use the trusted baseline and verifier for the decision. Document which controls still depend on branch protection, owner review, or separately authorized CI administration. If those controls are not configured, demonstrate detection and label human review as required; do not claim that the agent is technically unable to edit repository files.

**Bootstrap:** the inspected remote base has no extraction compiler or trusted contract-change verifier yet. Implement and test those components with provisional local baseline fixtures, clearly labeled as development evidence. Independent review of the seed contract, verifier, and activation procedure establishes the initial reviewed baseline; record the exact seed/verifier revisions and review evidence. Before that review, report bootstrap review pending rather than claiming that candidate code has independently approved itself. Continue local implementation and demo work while preparing that review. Subsequently compare with the reviewed seed or a separately approved successor using a verifier selected outside the candidate change. Treat changes to the verifier/approval mechanism as a separate review-sensitive change.

The MUI extraction milestone must include a concrete baseline-update procedure so legitimate changes do not leave CI permanently failing. Separate code/schema verification from the status that awaits contract-change review; define what independently supplied review evidence allows activation and bind it to the exact old and new contract digests and reviewed verifier revision. Test bootstrap, an unaccepted change, an accepted exact change, and rejection of a stale or mismatched approval. Without a real approval channel, deliver detection and staged updates with activation outstanding. A checked-in self-asserted approval flag is insufficient. Do not modify GitHub administration or install new mandatory checks without authority.

## Milestones and acceptance gates

### 0. Reconcile sources and baseline

Read and record actual repository states and instructions, branch safely, select the existing core as the starting point, and run existing relevant checks before changes. Record pre-existing failures without weakening tests. Write a short implementation record in `docs/implementation/designlock-modernization.md` with scope, decisions, evidence, and remaining work. Do not make the user reapprove the already agreed design to begin.

**Exit evidence:** intended branch/base, cleanly separated user changes, source map, baseline command results, and the selected package-consumption approach for the website.

### 1. Preserve the core and establish independent fixtures

Port or reuse actual reference code through the reconciled history. Retain reference behavior tests. Add adversarial cases required by the test matrix before implementing new extraction behavior. Keep expected results separately authored rather than derived with the compiler under test.

**Exit evidence:** preserved modes and rejection behavior; post-repair revalidation; compiler/runtime import separation; concise notes on any corrected baseline defect. Do not preserve a security flaw just because it existed in the reference.

### 2. Prove MUI extraction end to end

Resolve the installed Button and Chip declarations, selected props and tokens, compile a policy-bounded artifact, and render valid fixtures through real MUI components. Include a deliberate unsupported fixture and a source-change fixture that changes the generated artifact. Demonstrate provenance and the baseline-update procedure.

**Exit evidence:** extracted facts trace to actual dependencies; selected types do not widen or lose prop correlations; independent negative cases fail; identical input produces identical artifacts; source updates cannot silently activate additional permission. Bootstrap review status remains explicit. Finish this gate before generalizing.

### 3. Add Carbon and contract evolution

Use the same compiler for Carbon Button and Tag. Allow library-specific selectors/theme readers and trusted renderer bindings; do not implement a second hardcoded schema generator. Preserve different library APIs instead of pretending that identically named components share props.

**Exit evidence:** four real components, both libraries' token sources, semantic/provenance diffs, unsupported coverage, and active-baseline enforcement pass the matrix below.

### 4. Integrate the kendowney.com demo

Make the current DesignLock project the maintained source of core/compiler logic. The website must consume the exact tested implementation through a reproducible version or immutable source revision. Do not depend on an absolute sibling path, symlink, uncommitted local changes, or an unpublished package version assumed to exist.

Prefer an immutable package or source dependency if available. A deterministic generated source snapshot is acceptable to preserve the existing website workspace structure, provided it has an explicit upstream revision and content manifest, a repeatable update command, and parity verification against the independently selected upstream source. It is not a second authored implementation. Do not commit compiled build output against website rules or publish to npm solely to get the local demo working. Prove a clean website install/build without the sibling repositories. Record any publication step needed before the final immutable dependency is remotely retrievable; do not claim clean remote reproducibility before it exists.

Preserve real MUI/Carbon previews, provider safeguards, and K2DS compatibility. Update generated contracts and adapter mappings together. Existing composition examples may stay if labeled as authored compositions with type-checked real component bindings; they do not count toward the four extracted components.

The demo must work with deterministic fixtures without credentials or paid inference. Show five selectable scenarios:

1. Supported valid output with real rendering.
2. Rejected unknown prop/token or prohibited capability, with the reason and no render.
3. Unsupported extraction with an honest explanation and no false success.
4. Upstream source/token change with its contract difference and source reference.
5. Attempted rule expansion that remains a candidate until explicit review.

Display contract/library versions, traceable sources, derived versus authored restrictions, and original versus repaired outcomes. A simulated library-change scenario must be clearly labeled as a fixture and actually run the diff logic. It must not rewrite the active contract or contact production. Keep live model output visibly distinct from fixtures; using Grok as the coding agent does not authorize changing the demo's inference provider.

Verify desktop and mobile layouts, keyboard use, labels, loading/error/empty states, readable diagnostics, and browser-console cleanliness. Preserve the site's existing design language and route. Update documentation and public claims to the implemented capabilities.

Verify that accepted values reach the real component faithfully. Use DOM/behavior assertions for rendered text, disabled state, selected variant behavior or library markers, and resolved token effects in the relevant theme. A non-null React element or two visually different panels is insufficient. Compare bound props with independent upstream type fixtures; model-facing renames and fixed adapter props must remain traceable. Avoid brittle snapshots of unrelated library markup.

**Exit evidence:** standalone clean build, exact core identity, offline scenarios, browser evidence, updated documentation, and passing site regression checks.

### 5. Review and release closure

Obtain independent review of extraction soundness, baseline selection/activation, runtime rejection/repair, and package/demo parity. Give the reviewer this contract, the actual diff, test evidence, and known limitations. Use a separate engineer or agent where available; a different model is optional. If unavailable, perform a separate adversarial pass, disclose that it is self-review, and leave independent review outstanding rather than claiming it happened. Fix confirmed findings and rerun affected checks.

Prepare the exact revisions and deployment/rollback instructions for the website. If Ken has already authorized the release, complete the existing PR/check/merge/deploy workflow within that authority and verify the deployed revision and all five scenarios. Otherwise stop only after local implementation, verification, and the reviewable release package are complete, then request the missing release approval. A local preview is not an updated public website.

Use the site's current operational documentation, not remembered deployment commands. The inspected deployment reference targets the existing `site` service in `/home/brain/kendowney.com`; inspect current reality before release. Do not redeploy other applications, change secrets, or perform broad cleanup.

## Required adversarial evidence

| ID | Case | Required result |
| --- | --- | --- |
| A01 | Component/prop with a concrete supported declaration | Correct closed schema and source provenance; valid fixture renders |
| A02 | Unknown prop, unknown component, illegal enum, missing required exposed field | Deterministic rejection with path/code; no strict render |
| A03 | Alias/re-export, renamed import, optional boolean, intersection, correlated object union/overload | Correct identity, concrete root/generic binding, and whole-props semantics; impossible prop combinations and same-name unrelated substitutions rejected |
| A04 | Selected unresolved generic/conditional, `any`, `unknown`, open index signature | Explicit unsupported result, unsuccessful compilation, no permissive fallback |
| A05 | Intentionally excluded callback or required prop excluded without binding | Optional exclusion documented; required omission blocks until safely bound |
| A06 | Token exists, token missing, unresolved alias, token value changed | Valid binding only for resolved approved tokens; missing/unsupported blocked; value change reported |
| A07 | Repeat generation in independent clean paths | Identical canonical semantic artifact; stable source-relative provenance |
| A08 | Add enum/token/prop, relax bound, remove requirement | Permission expansion reported against trusted baseline; no auto-activation |
| A09 | Remove allowed value, tighten bound, change provenance only | Restricted and provenance-only changes correctly separated; unclassifiable cases require review |
| A10 | Bootstrap, candidate edits to artifact/baseline/policy/verifier, exact and stale approvals | Seed review status explicit; trusted comparison detects changes; exact old/new/verifier identity required for activation; stale approval rejected, no self-approval |
| A11 | Malformed JSON/tree, oversized response, excessive depth/nodes/roots | Bounded rejection before renderer is called |
| A12 | Unsafe URL variants, event handlers, classes/styles, prototype-shaped keys | Rejected or explicitly denied by policy; no execution, prototype mutation, or unsafe binding |
| A13 | Repair returns invalid/unsafe/oversized tree | All post-repair checks rerun; rejected; original findings retained |
| A14 | MUI and Carbon source-defined variants differ | Same compiler respects both APIs; type fixtures and actual DOM/behavior prove accepted text, variant, disabled, and token values reach real components |
| A15 | Packed/pinned core consumed by standalone website | Proven identity/parity, no runtime compiler imports, clean install/build without sibling checkout |
| A16 | All five demo scenarios, desktop/mobile, no API key | Expected rendering/blocking and labels; keyboard usable; no horizontal overflow or console errors |

Use small purpose-built TypeScript fixtures to test requiredness, generics, and controlled version changes, plus integration tests against actual installed MUI/Carbon declarations. Synthetic fixtures alone do not establish library compatibility. Do not hardcode expected schemas into extraction logic, derive test expectations from its output, or remove negative cases to pass.

## Validation and delivery record

The following scripts were observed; recheck them after repository reconciliation. Run the repository's required gates, not just newly written tests.

- Reference/canonical core baseline: `npm run typecheck`, `npm test`, `npm run build`, `npm pack --dry-run`; existing Fallow audit/security gates where configured.
- Add compiler generation/freshness/diff/evaluation checks and tests to the canonical project's normal CI. Include contract/policy/token/config paths in CI triggers.
- Website: `npm run typecheck`, `npm test` (including core, adapters, K2DS, and provider tests), `npm run test:browser`, and `npm run build`.
- Preserve the website workflow's package build/pack checks, `npm audit --omit=dev`, K2DS build, `npm run test:storybook`, and changed-code/security checks. Adapt obsolete package paths if the consumption mechanism changes; preserve the checks' purpose.
- Browser tests must explicitly use fixtures/no credentials even if a development server is already running. Verify that a reused server cannot trigger paid inference. Use a clean server or intercept provider requests as needed.

Record exact commands, exit status, tested revision, key evidence paths, and any baseline failures. A blocked check remains blocked, not passed. Apply focused fixes, then rerun relevant checks; do not broaden the project into unrelated upgrades or refactors.

Final handoff must include:

1. Changes and why; repository/branch/revision map.
2. Supported extraction matrix, intentionally excluded capabilities, and unresolved limitations.
3. A01–A16 evidence and existing-check outcomes.
4. Provenance artifact and readable semantic-change examples for both libraries.
5. Independent-review findings and their resolution, or explicit review unavailability.
6. Website consumption identity, browser evidence, and local versus deployed status.
7. Remaining release action only if it lacks authority or external prerequisites.

Continue through the authorized milestones autonomously. Ask only for a real semantic ambiguity or unavailable authority. Do not stop after scaffolding, planning, or one passing happy path. Do not invent completed tests, deployments, extracted facts, or unsupported guarantees. After two unsuccessful attempts without new evidence, narrow the hypothesis and preserve a concise checkpoint rather than repeating the same approach.

## Method references

The plan adapts the contract/evidence checks from the local [Ken Loop Playbook](/Users/kendowney/.codex/skills/ken-loop-playbook/SKILL.md) and its [AI design-system contract enforcement loop](/Users/kendowney/.codex/skills/ken-loop-playbook/references/curated-loop-pack.md). It uses the existing repository test pipeline as the owner of verification; it does not adopt or schedule a recurring loop. The broad loop's accessibility and state checks apply to the selected demo surface, not a claim that the compiler proves every UI property.
