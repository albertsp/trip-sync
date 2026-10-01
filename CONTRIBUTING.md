# Contributing to TripSync

Thanks for your interest in improving TripSync! Bug reports, ideas and pull requests are all welcome.

## Table of contents

- [Reporting bugs and suggesting features](#reporting-bugs-and-suggesting-features)
- [Setting up your environment](#setting-up-your-environment)
- [Making changes](#making-changes)
- [Checks that must pass](#checks-that-must-pass)
- [Commit messages](#commit-messages)
- [Opening a pull request](#opening-a-pull-request)
- [Security issues](#security-issues)

## Reporting bugs and suggesting features

Open an [issue](https://github.com/albertsp/trip-sync/issues) and include:

- **For a bug:** what you did, what you expected, what happened instead, and your browser or OS. Screenshots and error messages help a lot.
- **For a feature:** the problem you want to solve and, if you have one, your proposed solution.

Please search existing issues first to avoid duplicates. For anything large, open an issue before writing code so we can agree on the approach.

## Setting up your environment

Follow the [Getting started](README.md#getting-started) section of the README. In short:

- Java 21
- Node.js 22 (see `frontend/.nvmrc`; run `nvm use` or `fnm use` inside `frontend/`)
- Docker, for the local PostgreSQL database

Use Node 22 when you touch `frontend/package.json`. A different npm version can generate a `package-lock.json` that the CI rejects.

You do **not** need Google OAuth credentials to run the unit and most of the E2E tests: the E2E specs mock the API, and the backend test only needs placeholder values for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Making changes

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. Keep each pull request focused on one thing. Small PRs are reviewed faster.
3. Add or update tests for any behavior you change.
4. Update the README or other docs if your change affects them.

### Project conventions

- **Backend (`backend/`):** controllers in `controllers/` only translate HTTP to service calls; business logic lives in `service/`, persistence in `repositories/`, entities in `domain/` and request/response contracts in `dtos/`. Invalid input raises `InvalidRequestException` and is turned into a `400` by the global exception handler.
- **Frontend (`frontend/`):** components live in `src/components/`, pure logic (and its unit tests) in `src/lib/`, shared API types in `src/types.ts`. Use the design tokens defined in `src/index.css` instead of hardcoding colors, so light and dark themes keep working.
- The UI is in Spanish. Keep user-facing copy in Spanish and code, comments and commits in English.
- Never commit secrets. Use the `.env.example` files as the template and keep `.env` files local.

## Checks that must pass

The [CI workflow](.github/workflows/ci.yml) runs on every push and pull request. Run the same checks locally before you push.

**Backend** (from `backend/`, with PostgreSQL running via `docker compose up -d`):

```bash
GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy ./mvnw verify
```

**Frontend** (from `frontend/`):

```bash
npm run lint
npm run build      # type-check + production build
npm test           # Vitest
```

**End to end** (from `frontend/`):

```bash
npx playwright install chromium   # first time only
npx playwright test               # `join-trip.spec.ts` needs the backend running on :8080
```

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org):

```
<type>: <short summary in the imperative>
```

Common types: `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `refactor`. Add a scope when it helps, for example `fix(calendar): ...`.

Examples from this repository:

```
feat: add trip proposals UI with voting and creator controls
fix: wire CSRF token exchange for SPA trip creation
chore: add Docker build and Fly.io deployment config for backend
```

## Opening a pull request

1. Push your branch and open a pull request against `main`.
2. Describe **what** changed and **why**, and link the related issue if there is one.
3. For UI changes, include a screenshot or short recording, ideally in both light and dark themes.
4. Make sure the CI is green. A maintainer will review your changes and may ask for adjustments.

## Security issues

Please do not report security vulnerabilities in a public issue. Use GitHub's private
[security advisory](https://github.com/albertsp/trip-sync/security/advisories/new) form instead, so the problem can be fixed before it is disclosed.
