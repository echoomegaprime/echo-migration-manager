# Security policy

Echo Migration Manager is a Cloudflare Worker (D1 + KV) that tracks database migration
state, cross-service migration plans, schema snapshots, and per-service locks for the ECHO
fleet. It is a tracking registry, not an executor -- it never runs `up_sql`/`down_sql`
against a target service's own database.

## Fixed in this consolidation pass

1. **Fail-open authentication bypass (the primary finding).** The auth middleware compared
   the presented key against `c.env.ECHO_API_KEY || ''`. If the `ECHO_API_KEY` secret was
   ever left unconfigured (a real, not-hypothetical deployment state -- Cloudflare Worker
   secrets are set out-of-band from code and can be omitted by mistake), the comparison
   silently became `key !== ''`. An attacker sending an explicitly empty
   `X-Echo-API-Key: ` header would then match and pass authentication entirely, gaining full
   read/write access to every route: registering fake migrations, marking real migrations
   "applied" without them ever having run (causing downstream deploy tooling that trusts
   this registry to skip real schema changes), rolling back tracked state, or reading
   `up_sql`/`down_sql` bodies for every service. Fixed to fail closed: an unconfigured
   `ECHO_API_KEY` now returns `503 Service misconfigured` for every protected route,
   never falling through to a satisfiable comparison.
2. **Timing side-channel in the credential check.** The API key comparison used a raw
   `!==`. Replaced with a constant-time `timingSafeEqual`.
3. **Dependency hygiene.** `hono` bumped via `npm audit fix` (28 advisories on the pinned
   range -- production runtime framework, not dev tooling, so fixed rather than documented
   and deferred). `@cloudflare/workers-types` `^4.20241230.0` -> `^5.0.0`, `wrangler`
   `^4.0.0` -> `^4.77.0`, `typescript` `^5.5.0` -> `^6.0.2`. `npm audit` now reports
   0 vulnerabilities.

## What was verified already correct when found

**No SQL injection or remote-execution risk.** Every database query uses `.bind()`
parameterization; the only string interpolation into SQL is a `?` placeholder count derived
from an array length (`migration_ids.map(() => "?").join(",")`), never user-controlled SQL
text. `POST /migrations/:id/apply` and `POST /plans/:id/execute` only update local status
rows -- an explicit code comment at the plan-execution call site states "cannot execute
remote SQL from this Worker." `POST /validate` is a purely local, read-only static-analysis
helper (balanced-parens/quotes, dangerous-keyword detection) and never executes the
submitted SQL against any database. Confirmed by reading the full 1281-line source before
making any change.

## Regression coverage

`tests/auth.test.mjs` (commit-first tamper/restore): reverting the fail-open fix (restoring
`c.env.ECHO_API_KEY || ''`) fails the two dedicated fail-closed tests. The timing-safe fix is
**not** functionally discriminable -- reverting `timingSafeEqual` to a raw `!==` produces
zero test failures (both return the same true/false for a wrong key) -- so
`scripts/certforge_journey.py`'s text-pattern check is the only regression guard for that fix.

## Supported version

Security fixes target the current `main` branch. Historical commits are retained for evidence
and are not patched in place.

## Report a vulnerability

Do not open a public issue for a suspected vulnerability. Send a private report to
`security@echo-op.com` with:

- affected endpoint and exact revision;
- reproduction steps and expected impact;
- safe contact details for follow-up.

Never include a live `ECHO_API_KEY` in a report.
