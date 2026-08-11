# Changelog

## Unreleased -- consolidation pass (2026-08-11)

### Security
- **Fixed a fail-open authentication bypass**: the auth check compared the presented key
  against `c.env.ECHO_API_KEY || ''`; an unconfigured `ECHO_API_KEY` made every route
  satisfiable by an explicitly empty `X-Echo-API-Key` header. The service now fails closed
  (503) instead.
- Constant-time `timingSafeEqual` for the API key comparison (was raw `!==`).

### Fixed
- `hono` bumped via `npm audit fix` (28 advisories on the pinned range; production runtime
  dependency).
- `@cloudflare/workers-types` `^4.20241230.0` -> `^5.0.0`, `wrangler` `^4.0.0` -> `^4.77.0`,
  `typescript` `^5.5.0` -> `^6.0.2`. `npm audit`: 0 vulnerabilities.
- `package.json` gained a real `test` script.

### Added
- `tests/auth.test.mjs` -- 12 tests covering both public routes, the fixed auth gate (missing
  key, wrong key, explicitly empty key), the new fail-closed 503 behavior, and a
  same-length-vs-different-length wrong-key timing-shape check.
- Full governance set (README, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, LICENSE, CI).

### Notable: no SQL injection or remote-execution risk found
Confirmed by reading the full source before making any change: every query is parameterized,
and this service tracks migration state only -- it never executes `up_sql`/`down_sql` against
any target database. See SECURITY.md.

## 1.0.0 -- original release

Migration tracking, cross-service migration plans, schema snapshots, per-service locks, SQL
validation, and a daily cron sweep for expired locks and pending/failed migration alerts.
