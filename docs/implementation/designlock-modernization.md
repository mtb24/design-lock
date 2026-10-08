# DesignLock modernization

Local implementation record for the 2026-09-23 contract. This is not an
activation approval and not a public release.

## Scope and decisions

The canonical project is `/Users/kendowney/Sites/DesignLock`, branch
`feature/designlock-modernization`, base `361632e0843423f51f7824f354a36062d8194e52`
(`origin/main`). The obsolete regex checkout at `c969c20` was not used as the
implementation base. `/Users/kendowney/Sites/design-lock` was left read-only at
that same remote revision.

`@design-lock/core` remains the browser runtime. Diff, activation, and
canonical JSON live there and do not import the compiler, TypeScript, React,
or a component library. `@design-lock/compiler` is a private workspace package
that reads installed declarations and token sources. Policy selects what model
output may use. Generation writes `contracts/generated` only.

Baselines in `contracts/baselines` are provisional copies of the first seed.
`contracts/trust.json` is `bootstrap-review-pending`. A matching hash is not
approval. `DESIGN_LOCK_BASELINE` is ignored. `--base REV` reads the baseline
path from git. There is no GitHub branch protection or required check
configured by this work. A candidate can still edit repository files; that
control remains human review.

The website consumes a content snapshot, not a sibling path, symlink, or npm
publication. `packages/design-lock/UPSTREAM.json` records revision
`361632e0843423f51f7824f354a36062d8194e52`, `dirty: true`, and
`remotelyRetrievable: false`. The snapshot includes uncommitted DesignLock
content, so the git revision alone does not reproduce it. Remote
reproducibility starts after that tree is committed and pushed or published.

## Identifiers

| Item | Value |
| --- | --- |
| MUI semantic hash | `3af483d800a042df74e1dfbb59ac1e63dee0658a9a71e1cbca5f0bdd6dece856` |
| Carbon semantic hash | `f33d80c1be151c5e7a50e5188be6952eb03503174d9985dc0a848dc60fb2e7a3` |
| Verifier source hash | `cd4b47b31aaccc954af5785295f92ebad95a8b526deaae7630e50c952f4599da` |
| MUI packages | `@mui/material` 9.3.1, Button root `button`, Chip root `div` |
| Carbon packages | `@carbon/react` 1.113.0, `@carbon/themes` 11.78.0, `@carbon/styles` 1.112.0 |
| Palette primary | `#1976d2` from `createTheme().palette` |
| Tag background blue | `#d0e2ff` from `@carbon/themes` white theme |
| Trust status | `bootstrap-review-pending` |

Carbon Button exposes `kind`, including `danger--ghost`. It does not expose MUI
`variant`. Carbon Tag uses an explicit `TagBaseProps` branch and root `div`.
Requesting Tag without that branch fails with an ambiguous prop union.
`outline` and `high-contrast` stay unexposed. MUI Button `color` is narrowed
to the policy list and drops `inherit`. Chip `color` keeps the derived enum,
including `default`. Chip `children` requested as text fails because string is
not assignable.

## Supported and unsupported

| Surface | Result |
| --- | --- |
| MUI Button children, variant, size, disabled, href, selected colors | Derived or policy-narrowed; valid fixtures render |
| MUI Chip label, variant, size, color, disabled | Derived; label is policy text |
| Carbon Button children, kind, size, disabled, href | Derived; kind is not a MUI variant |
| Carbon Tag children, selected type, size, disabled | Selected `TagBaseProps` branch; type tokens use `tagBackground{Pascal}` |
| Optional callbacks, class, style, sx, ref, polymorphic selector | Excluded when optional |
| Required prop excluded without a binding | Compilation fails |
| `any`, `unknown`, open index, unresolved generic or conditional | Unsuccessful extraction, no permissive schema |
| Correlated `{mode,value}` union | Whole-object `oneOf`; `{mode:"text", value:7}` fails |
| Carbon Tile title, body, tags, actionHref | Adapter composition, not extracted Tile props |
| Model-owned code, styles, classes, unsafe URLs | Blocked by the runtime policy |

## Checks

DesignLock, on the dirty feature branch:

| Command | Exit |
| --- | --- |
| `npx tsc --noEmit` and `npm test` | 0. Core 15, compiler 15 including the isolated lifecycle test, both contracts fresh and unchanged against provisional baselines, example DOM tests 7 |
| `npm run contracts:enforce -- --base origin/main` | 4. `origin/main` has no verifier file. This is the fail-closed result, not a pass |
| `npm run build` and `npm pack --dry-run` | 0. Pack contains core `dist` only |
| Fallow audit and security | 0 |
| `npm audit --omit=dev` | 0 after updating `fast-uri` to 3.1.8 inside Ajv's existing range. Full `npm audit` still reports 2 moderate dev-dependency findings |

Website, dirty `feature/designlock-modernization` from `e04a5435bdf89cbb4af8a4eeab4eabea1d161c0f`:

| Command | Exit |
| --- | --- |
| `npx tsc --noEmit` | 0 |
| `npm test` | 0. Core 15, K2DS 67, adapters and scenarios 5, provider tests 15, snapshot parity 23 files |
| `npm run build` | 0 |
| `npm run build --workspace @kendowney/k2ds` | 0 |
| `npm run test:storybook` | 0. Storybook 10.5.7 wrote `packages/k2ds/storybook-static` |
| `npm run test:browser` | 0. Four design-lock tests: desktop scenarios, desktop comparison, mobile scenario walk, mobile comparison |
| Fallow audit and `fallow security --gate new --changed-since origin/main` | 0. Audit still warns on adapter duplication and existing CSS token drift |
| `npm audit --omit=dev` | 0 after compatible updates of `fast-uri`, `browserslist`, `baseline-browser-mapping`, and `js-yaml`. Full `npm audit` still reports 1 low and 2 moderate |
| Clean `npm ci` and `npm run build` in `/tmp/kendowney-clean` | 0. The copy excluded the DesignLock sibling, `node_modules`, and build output |

## A01–A16

| ID | Evidence |
| --- | --- |
| A01 | Compiler tests extract MUI Button and Chip. Mounted `result.rendered` shows Save, contained, primary `#7b1fa2`, and disabled |
| A02 | Neon color is `INVALID_TOKEN`; a rejected tree leaves `rendered` null and does not call the adapter |
| A03 | Correlated ModeView fixture; text-on-discriminator, alien branch, and `BOGUS` binding fail; re-export resolves to origin Widget |
| A04 | `contracts/fixtures/unsupported.json` and the compiler test; compilation unsuccessful |
| A05 | Optional `onClick` excluded; required `id` blocks until an adapter binding; `required: false` cannot relax a required source prop |
| A06 | Palette primary is `#7b1fa2` from `examples/react-adapters/selected-mui-theme.ts`; Carbon tag blue remains `#d0e2ff`; token-only approval does not activate |
| A07 | Repeat MUI compile is byte-stable and declaration paths are package-relative |
| A08 | Source v2 adds `warning` and classifies as expanded. Ordinary evaluate and the adapter registries read baselines. `--preview` is the labeled candidate path |
| A09 | Type changes and unknown keywords are unclassifiable. Enum removal and `additionalProperties: false` to `true` are expanded |
| A10 | Approval matches recomputed review identities, including token values, plus the verifier identity. Bootstrap stays pending. Stale CLI activation exits 4 and writes no baseline |
| A11 | Existing engine bounds reject malformed and oversized trees before render |
| A12 | Unsafe URLs, handlers, classes, styles, and prototype-shaped keys are rejected |
| A13 | Lenient repair rechecks limits, schema, and safety; original findings remain |
| A14 | DOM tests mount `result.rendered` for MUI and Carbon text, disabled, variant or kind classes, and the shared theme colors |
| A15 | Website snapshot manifest and parity check. Remote retrieval is explicitly false |
| A16 | Playwright desktop and mobile scenario tests, no inference call observed |

## Release status

Local website files are updated. The public site is not. kendowney.com `main`
is still `e04a543`. Deployment, when authorized, follows `CLAUDE.md`: commit
and push, rsync to `brain@147.182.240.24:~/kendowney.com/` excluding
`node_modules`, `.git`, build output, and `.env`, then `docker compose build
site && docker compose up -d site` in that directory only. Rollback is the
previous site checkout rebuilt the same way. Do not redeploy other
applications or change secrets.

This session does not include commit, push, pull request, merge, npm publish,
or deploy authority.

## Correction pass

The six review defects are fixed locally. Trust status remains
`bootstrap-review-pending`. The provisional MUI baseline was recopied from the
regenerated artifact so the selected theme primary `#7b1fa2` is the development
seed. That copy is not an activation. Carbon semantic hash is unchanged.

Current identities:

| Identity | Value |
| --- | --- |
| MUI semantic | `3af483d800a042df74e1dfbb59ac1e63dee0658a9a71e1cbca5f0bdd6dece856` |
| MUI provenance | `5fb5c1031f742ba6b3b9d70259d4a4d1877bb9f008789352cf345dee43ed6581` |
| Carbon semantic | `f33d80c1be151c5e7a50e5188be6952eb03503174d9985dc0a848dc60fb2e7a3` |
| Carbon provenance | `0fa1ea7aa4f181c7769f4e65eb19a329a8afa8800440d664b3a56538259f8fb4` |
| Verifier | `6ab38dde1963b5cdee48fcb040537021221e92e863b3b3de4484c7fbdc579e27` |
| Website snapshot | 23 files from `361632e` dirty; `remotelyRetrievable: false` |

`contracts:check` is provisional and uses the workspace baseline. `contracts:enforce --trusted --base REV` reads the baseline and verifier bytes from that revision. A missing baseline or verifier file exits 4. If the working-tree verifier hash differs from the selected base, the candidate cannot authorize itself. Running that command against `origin/main` exits 4 because that revision has no verifier. The quality workflow includes this step, so it stays red until a reviewed revision containing the verifier is the base. Repository protection and a human reviewer are still required; this workspace cannot supply that authority.

[Correction review](1d26fd40-0f69-4040-a1ef-fb8626b73856) reproduced the six negative cases and reported them fixed. It did not approve the seed or the verifier.

## Approved-change lifecycle

Bindings are applied to each correlated branch before the exposed fields are projected. A fixed `mode:"text"` keeps `value` as a string. `mode:"count"` keeps it as a number. Bindings that match no branch fail compilation.

Trusted enforcement materializes the decision files from `--base` and executes that revision's `packages/compiler/src/trusted-decision.ts`. The hash uses Node's `crypto` inside that process and covers `src/index.ts`, activation, diff, canonicalization, the compiler entry, and the trusted runner. A candidate edit to `src/index.ts` cannot make an unapproved change pass.

`contracts:enforce --approval` accepts an exact reviewed approval against the previous baseline. Unchanged contracts pass without activation. Missing bases, stale approvals, and a verifier mismatch still fail. The real `contracts/trust.json` stays `bootstrap-review-pending`.

`activate --contract mui` and `--contract carbon` update one library. Unchanged contracts are no-ops. An invalid approval exits 4 before any baseline is written.

`packages/compiler/src/lifecycle.test.ts` passed in a temporary git repository with a simulated reviewed seed. It showed rejection before approval, exact MUI activation, trusted enforcement against the previous baseline, Carbon left byte-for-byte unchanged, then Carbon-only activation, then rejection of a stale approval and of a tampered `src/index.ts`.

[Lifecycle review](47eb0a21-4e02-46fd-be2c-1feadabeb11b) reran the binding regression and the lifecycle test and reported both passing. It did not approve the real seed.

Website snapshot remains 23 files from dirty `361632e`, parity ok, `remotelyRetrievable: false`. Website `npm test` and 4 Playwright design-lock tests passed. DOM tests still mount `result.rendered`.

## Active artifact, CI, and website identity

Trusted enforcement reads `contracts/baselines/{name}.json`, the same file ordinary evaluation uses. Identity is `reviewIdentity` of those contents. A workspace baseline that differs from the selected git baseline fails unless it is the exactly approved successor. Trust configuration that points somewhere else is rejected. Generated preview stays on `--preview`.

CI runs `sh scripts/enforce-trusted.sh`. `BASE_REF` is `github.base_ref` or
`main`. The `design-lock-approval` GitHub Environment supplies approval JSON as
the `DESIGN_LOCK_APPROVAL` secret. The workflow materializes it with mode 0600
under `$RUNNER_TEMP` without printing it. A candidate-committed approval is not
independent authority. The lifecycle test invokes this same script.

`scripts/sync-design-lock.mjs` records `verifierSourceHash` from `packages/compiler/src/verifier.ts`. Parity against the canonical tree compares that value. Both currently report `6ab38dde1963b5cdee48fcb040537021221e92e863b3b3de4484c7fbdc579e27`. The snapshot remains 23 files from dirty `361632e`, `remotelyRetrievable: false`.

`packages/compiler/src/lifecycle.test.ts` passed: unchanged enforcement, baseline-only `inherit` expansion rejected, preview does not change ordinary evaluation, exact MUI approval through the CI script, evaluation of the active successor, active tamper rejected, Carbon-only activation, stale approval rejected, and a tampered `src/index.ts` rejected. `npm audit --omit=dev` is 0. Fallow audit is 0.

[Active-artifact review](cf10d74e-4a10-40ca-8e48-60fecfcc8c8b) reran the lifecycle test, confirmed the workflow script, and matched the website verifier to the canonical hash. It did not approve the real seed.

## Remaining

- Independent review of the seed, verifier, and activation procedure. Record the reviewer and the exact revisions before changing trust status to `reviewed`.
- Commit and push both trees before claiming a remotely retrievable snapshot.
- Trusted CI enforcement against `origin/main` remains a deliberate failure until that base contains the verifier.
- Full `npm audit`, including dev dependencies, still reports moderate findings in both repositories. Production `npm audit --omit=dev` is clean.

## Release-candidate correction

The release pass replaced the non-operational repository-variable path with the
protected Environment transport above. The one-time bootstrap command now
requires:

- a base with neither trust state nor a verifier;
- a clean exact candidate commit and `reviewed` trust status;
- an approval file outside the candidate repository;
- exact MUI and Carbon review, semantic, provenance, policy-input, and
  token-input identities;
- the exact verifier identity, independent reviewer identity, and evidence
  reference.

The bootstrap test uses the same `scripts/enforce-trusted.sh` entry point as CI.
It proves exact evidence passes, stale evidence fails, a candidate-committed
approval fails, and the bootstrap path becomes unavailable after the reviewed
verifier is present on `main`. The existing lifecycle case continues to prove
that unchanged contracts pass without approval, an unapproved baseline edit
fails, exact successors pass, stale approval and active-artifact tampering fail,
and MUI-only activation leaves Carbon byte-for-byte unchanged.

The current candidate remains `bootstrap-review-pending` until the independent
exact-head review described in the release request completes. Repository
environment configuration, protected secret installation, and branch
protection are performed only after that evidence exists.

## Release freeze

The candidate now binds `reviewIdentity` to the entire artifact, requires
approvals to name the exact candidate commit, and executes check/bootstrap
through `scripts/enforce-trusted.sh`. After a trusted predecessor exists, that
script materializes `origin/$BASE_REF` under `$RUNNER_TEMP` and runs that
revision's CLI so a candidate-edited `packages/compiler/src/cli.ts` cannot
self-authorize. The workflow copies the base entrypoint when present; the
bootstrap PR still uses the candidate script because `origin/main` has no
verifier. `DECISION_FILES` includes CODEOWNERS, the quality workflow, and the
enforcement script. `.gitignore` matches `node_modules` as a name rather than
only as a directory so a lifecycle-test symlink is not committed and then
extracted into the trusted tree.

Freeze checks on the dirty candidate:

| Command | Exit |
| --- | --- |
| `npx tsc --noEmit` | 0 |
| `npm test` | 0. Core 15, compiler 16 including bootstrap and lifecycle, both contracts fresh against provisional baselines, example DOM tests 7 |
| `npm run build` and `npm pack --dry-run` | 0. Pack contains core `dist` only |
| `npm audit --omit=dev` | 0 |
| Fallow audit and `fallow security --gate new --changed-since origin/main` | 0 |
| `git diff --check` | 0 |

Current identities before independent review:

| Identity | Value |
| --- | --- |
| MUI semantic | `3af483d800a042df74e1dfbb59ac1e63dee0658a9a71e1cbca5f0bdd6dece856` |
| MUI provenance | `5fb5c1031f742ba6b3b9d70259d4a4d1877bb9f008789352cf345dee43ed6581` |
| Carbon semantic | `f33d80c1be151c5e7a50e5188be6952eb03503174d9985dc0a848dc60fb2e7a3` |
| Carbon provenance | `0fa1ea7aa4f181c7769f4e65eb19a329a8afa8800440d664b3a56538259f8fb4` |
| Verifier | `416bd36523d3048dcef192d0ddf38579aa6abb0aac16aa520b2fbc9bff95f4ec` |
| Trust status | `reviewed` |

## Independent seed review

[Independent seed review](991bcb4b-25c8-4de3-8fe3-5fc576a9f05e) inspected
`297ec95b96fa325de6a2dbad295a70e79dfb41ca`, recomputed the seed and verifier
identities, and reproduced cases 1–14. Verdict: `approve-seed`. No blocking
findings. Two earlier reviewer launches failed on other-model usage limits
before producing findings.

Reviewer identity: `cursor-composer-2.5:991bcb4b-25c8-4de3-8fe3-5fc576a9f05e`.
Evidence: independent exact-head review of `297ec95`. The follow-up commit that
sets `contracts/trust.json` to `reviewed` must be confirmed against the new
HEAD before the external bootstrap approval is bound. The protected approval
is not this file and is not checked in.

| Identity | Value |
| --- | --- |
| MUI reviewIdentityHash | `61c7c88625368b94d5ab1c6232a71072724a09708a667ea3dd8a2500c9ca9946` |
| MUI semantic | `3af483d800a042df74e1dfbb59ac1e63dee0658a9a71e1cbca5f0bdd6dece856` |
| MUI provenance | `5fb5c1031f742ba6b3b9d70259d4a4d1877bb9f008789352cf345dee43ed6581` |
| MUI policyInputHash | `bd4f7947e97a24df8cce3a85bf425ce12e78fd45976a5b7c694a1e867ae624e7` |
| MUI tokenInputsHash | `c3917ba3e2934631d6c5297d96f7468388e92a1dd97231c83b5c04eee5f04914` |
| Carbon reviewIdentityHash | `aab32b63cc73db47a47276944d3d66099e1a73118d63a9f0fbb03a6580c4ff00` |
| Carbon semantic | `f33d80c1be151c5e7a50e5188be6952eb03503174d9985dc0a848dc60fb2e7a3` |
| Carbon provenance | `0fa1ea7aa4f181c7769f4e65eb19a329a8afa8800440d664b3a56538259f8fb4` |
| Carbon policyInputHash | `faa8fe56b21d37f572ac3ad9cb39839661bfe436aacadc64da8951a02f6beb9a` |
| Carbon tokenInputsHash | `0a0eebb1805b9fb61649b98652dcc1d1b367b335e8e6b56f8b0bf0b2db9e0970` |
| Verifier at 297ec95 / e5886c0 | `416bd36523d3048dcef192d0ddf38579aa6abb0aac16aa520b2fbc9bff95f4ec` |

[Confirm reviewed trust HEAD](8cf4ef00-30dc-43ea-8a74-59878018f4e5) confirmed
`e5886c06b72ca372f774f3cc1226daf120ea32ed`. Seed identities were unchanged.
`contracts/trust.json` is `reviewed` and contains no approval JSON.

A follow-up CI correction checks out the pull-request head instead of the merge
commit and requires `CANDIDATE_COMMIT` to match `HEAD` when set. That changes
`DECISION_FILES`, so the verifier becomes
`74ab83ccd0e4b5b0bc2597ecdeff676317e7e1b5492b14b8bf9d5745b73509c6` and the
independent reviewer must confirm that exact new head before the external
bootstrap approval is bound.

[Confirm CI-correction HEAD](5154b1c27b1e2cac16969887e64786f0132b4219)
confirmed `5154b1c`. The external bootstrap approval was bound to that commit,
the MUI and Carbon review identities, verifier
`74ab83ccd0e4b5b0bc2597ecdeff676317e7e1b5492b14b8bf9d5745b73509c6`, and the
reviewed policy and token inputs. The approval lives outside the tree: the
agent-store file and GitHub Environment secret `DESIGN_LOCK_APPROVAL`.

## Released revisions

| Item | Value |
| --- | --- |
| DesignLock PR | https://github.com/mtb24/design-lock/pull/4 |
| DesignLock PR head | `5154b1c27b1e2cac16969887e64786f0132b4219` |
| DesignLock merge | `3b49d7a43fd4572797bddb0cbda719c96b700819` |
| Trust status | `reviewed` |
| Verifier | `74ab83ccd0e4b5b0bc2597ecdeff676317e7e1b5492b14b8bf9d5745b73509c6` |
| Reviewer | `cursor-composer-2.5:991bcb4b-25c8-4de3-8fe3-5fc576a9f05e` |
| kendowney.com snapshot PR | https://github.com/mtb24/kendowney.com/pull/21 |
| kendowney.com snapshot head | `5ea89fa9589310f9a3774159da0fb808ffa92308` |
| kendowney.com snapshot merge | `534775694610abb014a9a10c8db7d0684a713ed4` |
| Website UPSTREAM | `3b49d7a`, `dirty: false`, `remotelyRetrievable: true`, 23 files |
| Site image lockfile PRs | https://github.com/mtb24/kendowney.com/pull/22 , https://github.com/mtb24/kendowney.com/pull/23 |
| Deployed kendowney.com main | `8a194a63aaa70a72a52343dd91071d671c811384` |
| Live `/design-lock` | https://kendowney.com/design-lock |

Protected approval transport is the `design-lock-approval` GitHub Environment
secret `DESIGN_LOCK_APPROVAL`. Branch protection on DesignLock `main` requires
the `verify` check. Bootstrap is limited to a missing trusted predecessor plus
the exact reviewed evidence; unchanged enforcement against reviewed `main`
exits 0, and an unapproved contract expansion exits 2.

## Deployment

Previous production site container `18b9412d0ad7` was built
`2026-10-08T23:17:59Z` from the pre-snapshot tree (`e04a543`, no
`UPSTREAM.json`). Rollback is rsync of that earlier tree, then
`docker compose build site && docker compose up -d site` only. The VPS `.env`
was preserved.

The first new image failed because Docker ran `npm install` without
`package-lock.json`. The lockfile is now copied. `npm ci` then failed on
Alpine-only optional packages missing from the macOS lockfile, so the image
uses `npm install --include=dev` with the lockfile present.

Deployed container `e7ab3eacc97a` started `2026-10-08T23:29:14Z`. Live
verification: home, `/work`, `/honest-fit`, `/resume`, `/contact`, and
`/design-lock` return 200. All five fixture scenarios match the reviewed
snapshot (MUI 9.3.1, Carbon 1.113.0, `#7b1fa2`, `#d0e2ff`, upstream
`3b49d7a`, trust `reviewed`). Rejected, unsupported, upstream, and expansion
cases do not render. Server logs show no errors. `@design-lock/core` was not
published to npm.

A live Generate comparison on production attempted DigitalOcean Inference
because a scoped key is present in the VPS `.env` and returned a provider
failure. The five fixtures do not use that path.
