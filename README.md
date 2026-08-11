# Echo Migration Manager

A database-migration tracking registry (not an executor) on Cloudflare Workers. Records
migration definitions, applied/rolled-back status, cross-service migration plans, schema
snapshots, service-level locks, and validation of proposed SQL for well-formedness. Every
fleet service is responsible for actually running its own `up_sql`/`down_sql` against its own
database; this service is the system of record for what has (and has not) run.

## Endpoints

| Access | Method | Path | Description |
|---|---|---|---|
| Public | GET | `/`, `/health` | Health |
| Authenticated | everything else | Migration/plan/lock/snapshot management, reporting, SQL validation |

## Authentication

Every route other than `/` and `/health` requires `X-Echo-API-Key`, compared to
`env.ECHO_API_KEY` in constant time -- **and the service fails closed (503) if
`ECHO_API_KEY` is not configured**, rather than falling through to a comparison an
attacker could satisfy. See [SECURITY.md](SECURITY.md) for the real bug this replaced.

## Verify

```powershell
npm install
npm test
```

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability -- never as a public issue.

## License

See [LICENSE](LICENSE). Contributions: see [CONTRIBUTING.md](CONTRIBUTING.md).
