#!/bin/sh
# Trusted enforcement entry used by CI and the lifecycle test.
# BASE_REF selects origin/$BASE_REF. DESIGN_LOCK_APPROVAL, when set, is an
# absolute path to an approval artifact supplied outside the candidate tree.
# A file authored by the candidate is not independent authorization.
set -eu
base_ref="${BASE_REF:-main}"
approval="${DESIGN_LOCK_APPROVAL:-}"
if ! git cat-file -e "origin/${base_ref}:packages/compiler/src/verifier.ts" 2>/dev/null; then
  echo "BOOTSTRAP LIMITATION: origin/${base_ref} has no trusted verifier; protected exact-head review evidence is required."
  if [ -z "$approval" ]; then
    echo "Missing protected bootstrap approval." >&2
    exit 4
  fi
  exec npx tsx packages/compiler/src/cli.ts bootstrap-review --base "origin/${base_ref}" --approval "$approval"
fi

# Once a reviewed predecessor exists, candidate orchestration is not trusted.
# Execute the compiler and verifier from the selected base while they inspect
# the candidate working tree and active artifacts.
trusted_root="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/designlock-trusted.XXXXXX")"
trap 'rm -rf "$trusted_root"' EXIT HUP INT TERM
git archive "origin/${base_ref}" | tar -x -C "$trusted_root"
rm -rf "$trusted_root/node_modules"
ln -s "$PWD/node_modules" "$trusted_root/node_modules"
trusted_cli="$trusted_root/packages/compiler/src/cli.ts"
tsx="$PWD/node_modules/.bin/tsx"
if [ -n "$approval" ]; then
  "$tsx" --tsconfig "$trusted_root/tsconfig.json" "$trusted_cli" check --trusted --base "origin/${base_ref}" --approval "$approval"
  exit $?
fi
"$tsx" --tsconfig "$trusted_root/tsconfig.json" "$trusted_cli" check --trusted --base "origin/${base_ref}"
