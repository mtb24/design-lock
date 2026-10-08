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
if [ -n "$approval" ]; then
  exec npx tsx packages/compiler/src/cli.ts check --trusted --base "origin/${base_ref}" --approval "$approval"
fi
exec npx tsx packages/compiler/src/cli.ts check --trusted --base "origin/${base_ref}"
