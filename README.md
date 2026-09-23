# TripSync

> Group trip planner: everyone marks their free days and budget, TripSync turns it into a heatmap of the dates that work for the most people — no account needed to join.

[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat&logo=openjdk&logoColor=white)](https://openjdk.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4-6DB33F?style=flat&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)

## Why this exists

Organizing a group trip usually means a chat thread where ten people argue about dates and nobody wants to admit their real budget. I wanted a tool that turns "when can everyone go" into a single visual — a calendar where the darkest days are the ones with the most availability — without forcing every participant to create an account just to answer two questions.

## How it works

1. A user signs in with Google and creates a trip with a title and a range of possible dates.
2. They share the generated link with the group.
3. Anyone who opens the link marks their available dates and budget — no account required.
4. The summary page shows a calendar heatmap (the more people free on a day, the darker it is) and the group's minimum shared budget.

## Screenshots

*(add here: Landing/creation, JoinForm, SummaryTrip heatmap)*

## Stack

**Backend**
- Java 21 · Spring Boot 4 (Web, Data JPA, Security, OAuth2 Client)
- PostgreSQL

**Frontend**
- React 19 · TypeScript · Vite
- React Router, react-day-picker

**Infra**
- Docker Compose (PostgreSQL)

## Architecture

```
frontend/   React + TypeScript SPA (Vite)
backend/    Spring Boot REST API
            ├── controllers/   HTTP endpoints
            ├── service/       business logic
            ├── repositories/  data access (Spring Data JPA)
            ├── domain/        JPA entities
            └── dtos/          API request/response contracts
```

Authentication runs through Google OAuth2 via Spring Security, with cookie-based sessions and CSRF protection (`XSRF-TOKEN`) on state-changing requests. Only trip creation requires authentication; joining a trip and viewing its summary are public actions gated solely by the shared link.

## Technical decisions

**No account to join a trip**
The person creating the trip is the only one who needs an identity (their Google account, mostly to prevent throwaway spam trips). Participants only need the link — matching how these plans actually get shared, over WhatsApp or email, by people who won't sign up for one-off use.

**Cookie-based sessions with explicit CSRF handling**
Spring Security's default `CsrfTokenRequestHandler` XOR-masks the token it issues, but a React SPA reading the `XSRF-TOKEN` cookie directly sends back the raw value — every state-changing request came back `403` even with a valid session. Fixed by switching to `CsrfTokenRequestAttributeHandler` (plain token, no masking) and adding a dedicated `/api/csrf` endpoint the frontend calls to prime the cookie before its first `POST`.

**CORS with credentials, split origins**
Frontend (`:5173`) and backend (`:8080`) run on different origins in development, so cross-site cookies require `CORS` explicitly configured with `allowCredentials(true)` and the frontend issuing requests with `credentials: 'include'` — a default CORS setup silently drops the session cookie instead of failing loudly, which makes it a easy to overlook until auth "randomly" stops working.

**Per-participant edit token instead of accounts**
Each participant gets a random token when they submit their availability, stored alongside their response. It's the mechanism planned for letting someone update their answer later without needing a login — the same "no friction" principle applied to editing, not just joining.

## Challenges

**Debugging a 403 that only showed up from the browser**
`POST /trips` worked fine from `curl` with a manually copied token, but always failed from the app. Reproducing it with the browser's dev tools open showed the cookie and header values being sent were identical strings — which ruled out a frontend bug and pointed at the token comparison on the server. Reading Spring Security's `CsrfTokenRequestHandler` source clarified this: the default handler expects to decode a masked token, and a manually-read cookie value was never going to match. This is the kind of bug that's invisible in the code and only shows up once real, cross-origin browser behavior is exercised — matches the commit `cc746c6`.

**Gating a feature behind auth without a login page**
Trip creation needed to require Google sign-in, but adding a full login screen would work against the "zero-friction" pitch. Solved by keeping a single Landing page that checks `/api/me` on load and reveals the create-trip form once a session exists, with sign-in itself reduced to one "Continue with Google" button.

## Getting started

### Requirements

- Java 21
- Node 20+
- Docker (for PostgreSQL)
- Google OAuth2 credentials ([Google Cloud Console](https://console.cloud.google.com/apis/credentials)) with:
  - Authorized origin: `http://localhost:5173`
  - Redirect URI: `http://localhost:8080/login/oauth2/code/google`
  - Production origin: `https://trip-sync-app-theta.vercel.app`
  - Production redirect URI: `https://trip-sync-app-theta.vercel.app/backend/login/oauth2/code/google`

### 1. Database

```bash
docker compose up -d
```

Starts PostgreSQL on `localhost:5432` with the `tripsync_data` database.

### 2. Backend

Set your Google credentials as environment variables before starting:

```bash
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
```

```bash
cd backend
./mvnw spring-boot:run
```

The API is available at `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is available at `http://localhost:5173`.

## Main endpoints

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/trips` | Creates a trip | Required (Google) |
| GET | `/trips/{id}` | Gets a trip's data | Public |
| POST | `/trips/{id}/participants` | Joins a participant with their dates and budget | Public |
| GET | `/trips/{id}/summary` | Returns the availability heatmap and group budget | Public |
| GET | `/api/me` | Returns the authenticated user (or 401) | — |

## Deployment

**Frontend → Vercel** (`trip-sync-app`, Root Directory `frontend/`, branch `main`). Build env vars:

- `VITE_API_BASE_URL=/backend` — all API calls go through the same-origin proxy declared in `frontend/vercel.json`
- `VITE_APP_BASE_URL=https://trip-sync-app-theta.vercel.app` — base for share links

**Backend → Fly.io** (`trip-sync-api`, config in `backend/fly.toml`). Secrets via `fly secrets set`:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `FRONTEND_URL=https://trip-sync-app-theta.vercel.app` — post-login redirect
- `CORS_ALLOWED_ORIGINS=https://trip-sync-app-theta.vercel.app`
- `OAUTH2_REDIRECT_URI=https://trip-sync-app-theta.vercel.app/backend/login/oauth2/code/google` — must be registered verbatim in Google Cloud Console and matches the `/backend/*` proxy path
- `COOKIE_SAME_SITE=None`, `COOKIE_SECURE=true`

The browser only ever talks to the Vercel domain (`/backend/*` is rewritten to Fly), so the session and CSRF cookies are first-party.

## Project status

This is a functional MVP built as a portfolio project. Planned next steps:

- Closing a trip (the data model already supports the `CLOSED` status; the endpoint is still missing).
- Editing already-submitted availability via each participant's edit token.
- Automated backend and frontend tests.
