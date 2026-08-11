# Contributing

Thank you for improving Echo Migration Manager. This is a public, proprietary infrastructure
project: contributions are welcome for review, but repository visibility does not grant a
general use or redistribution license.

## Development path

1. Open an issue describing the behavior being changed.
2. Create a focused branch from current `main`.
3. Add a failing test before changing the auth middleware or `timingSafeEqual` -- see
   SECURITY.md for the exact fail-open bug this repo previously shipped and why the
   fail-closed 503 behavior on an unconfigured `ECHO_API_KEY` must never regress.
4. Validate before opening a pull request:

   ```powershell
   npm install
   npm test
   ```

5. Open a pull request using the repository template and include exact test output.

## Pull-request requirements

- No secrets (`ECHO_API_KEY`) are included.
- No stubs, placeholders, or self-asserted readiness.
- **Any change to the auth middleware's behavior when `ECHO_API_KEY` is unset must be
  called out explicitly in the pull request description** -- a permissive default here
  (`|| ''`, `?? true`, or similar) reopens a real authentication bypass this repo shipped
  and fixed once already.
