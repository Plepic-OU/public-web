#!/usr/bin/env bash
# npm audit as a RATCHET, not a bar. Runs inside the `lint` job.
#
# Why a ratchet: on 2026-09-17 `npm audit --package-lock-only` against main
# reported 37 vulnerabilities — 16 high and 1 critical. A hard --audit-level=high
# would have failed the first PR that used it and every PR after, so the check
# would have been removed within a day. This fails only when a change RAISES the
# high-plus-critical count above the base branch. Same shape as the vault's
# ruff_ratchet, and for the same reason: Scopeful's 364 pre-existing ruff
# findings are why that one is a ratchet too.
#
# Why inside `lint` and not a job of its own: the job ids (lint, tests, claims)
# are the required status checks on main. A new job changes the check context and
# sits outside branch protection until someone re-arms it by hand.
#
# Cleaning up the existing 17 is a separate PR. All of it is build-time tooling
# for a static site; nothing reaches a visitor's browser.
set -uo pipefail

# Count high + critical out of `npm audit --json` on stdin. npm exits non-zero
# when it finds anything, so every call below tolerates that and reads the JSON.
count() {
  node -e '
let raw = "";
process.stdin.on("data", d => raw += d);
process.stdin.on("end", () => {
  let v = {};
  try { v = (JSON.parse(raw).metadata || {}).vulnerabilities || {}; } catch (e) {
    process.stderr.write("audit-ratchet: could not parse npm audit output\n");
    process.exit(2);
  }
  // process.stdout.write, not console.log: console.log runs a number through
  // util.inspect, which wraps it in ANSI colour codes even when stdout is a
  // pipe — the count then never compares equal to anything.
  process.stdout.write(String((v.high || 0) + (v.critical || 0)) + "\n");
});
'
}

audit_in() {
  ( cd "$1" && npm audit --package-lock-only --json 2>/dev/null ) | count
}

compare() {
  # $1 base count, $2 head count. Echoes the verdict, returns 1 when it rose.
  if [ "$2" -gt "$1" ]; then
    echo "audit-ratchet: high+critical rose from $1 to $2."
    echo "Run 'npm audit' and either upgrade the package or drop the dependency."
    echo "A pre-existing finding is fine; adding one is not."
    return 1
  fi
  echo "audit-ratchet: high+critical $2, base $1 — not rising."
  return 0
}

# --self-test proves the comparison itself, in the path that already runs. A
# ratchet nobody tests reads the same whether it works or is stuck at pass.
if [ "${1:-}" = "--self-test" ]; then
  fail=0
  compare 17 17 >/dev/null || { echo "self-test: equal counts should pass"; fail=1; }
  compare 17 16 >/dev/null || { echo "self-test: a drop should pass"; fail=1; }
  if compare 17 18 >/dev/null; then echo "self-test: a rise should fail"; fail=1; fi
  printf '%s\n' '{"metadata":{"vulnerabilities":{"low":8,"moderate":12,"high":16,"critical":1}}}' \
    | count | grep -qx 17 || { echo "self-test: count should read 17 from the npm shape"; fail=1; }
  [ "$fail" -eq 0 ] && echo "audit-ratchet: self-test passed"
  exit "$fail"
fi

# `bash "$0"`, not `"$0"`: CI invokes this as `bash scripts/audit-ratchet.sh`
# because a file added through the GitHub contents API lands mode 100644.
bash "$0" --self-test >/dev/null || { echo "audit-ratchet: self-test failed — the ratchet cannot be trusted."; exit 1; }

BASE_REF="${BASE_REF:-main}"
base_dir="$(mktemp -d)"
trap 'rm -rf "$base_dir"' EXIT

for f in package.json package-lock.json; do
  git show "origin/$BASE_REF:$f" > "$base_dir/$f" 2>/dev/null \
    || { echo "audit-ratchet: cannot read $f from origin/$BASE_REF — is fetch-depth 0 set?"; exit 1; }
done

base_count="$(audit_in "$base_dir")"
head_count="$(audit_in .)"
case "$base_count$head_count" in
  *[!0-9]*|"") echo "audit-ratchet: npm audit produced no count (offline?). Not trusting a pass."; exit 1 ;;
esac

compare "$base_count" "$head_count"
