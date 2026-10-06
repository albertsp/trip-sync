# Security policy

## Reporting a vulnerability

Please do not report security vulnerabilities in a public issue. Use GitHub's private
[security advisory](https://github.com/albertsp/trip-sync/security/advisories/new) form instead, so the problem can be fixed before it is disclosed.

Include what you found, how to reproduce it and the impact you see. You can expect a first answer within a few days.

## Scope

TripSync is a portfolio project. The most relevant areas are authentication (Google OAuth2, session cookies, CSRF), the public endpoints reachable with only a trip link, and input validation on participant data.

Never commit real secrets. Use the `.env.example` files as templates and keep your `.env` files local.
