# Ride-Sharing Platform

A full-stack ride-safety sharing app: travelers share their cab details with a companion, companions follow the trip on a map and leave feedback, and admins review users and feedback. React, Express, Sequelize (PostgreSQL), JWT and WebSockets.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6.x-52B0E7?logo=sequelize&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)

[![CI](https://github.com/VamsiKrishnaThota03/ride-share-safety/actions/workflows/ci.yml/badge.svg)](https://github.com/VamsiKrishnaThota03/ride-share-safety/actions/workflows/ci.yml)
[![CodeQL](https://github.com/VamsiKrishnaThota03/ride-share-safety/actions/workflows/codeql.yml/badge.svg)](https://github.com/VamsiKrishnaThota03/ride-share-safety/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

This repository is the monorepo version of the project: a Create React App frontend in the root and an Express/Sequelize backend in `backend/`. It contains the same code as the two split repositories that are deployed separately.

| Repository | What it contains |
|------------|------------------|
| [Ride-Sharing-Platform](https://github.com/VamsiKrishnaThota03/ride-share-safety) | **This repo**: frontend + backend together |
| [ride-sharing-platform-frontend](https://github.com/VamsiKrishnaThota03/ride-sharing-platform-frontend) | Standalone React client ([live demo](https://ride-sharing-platform-frontend.vercel.app)) |
| [ride-sharing-platform-backend](https://github.com/VamsiKrishnaThota03/ride-sharing-platform-backend) | Standalone Express API |

The app has three roles:

- **Traveler**: shares the details of a cab ride (trip ID, driver, phone, cab number) with a companion
- **Companion**: sees rides shared with their mobile number, follows the trip and leaves feedback
- **Admin**: views all users and all feedback

## Screenshots

| Log in | Traveler dashboard |
| --- | --- |
| ![Login page](docs/screenshots/login.png) | ![Share form, route preview and ride history](docs/screenshots/traveler-dashboard.png) |

| Companion dashboard | Admin: feedback |
| --- | --- |
| ![Rides shared with a companion](docs/screenshots/companion-dashboard.png) | ![Admin feedback table with ratings](docs/screenshots/admin-feedback.png) |

Screenshots were taken locally with sample data (SQLite development database).

## Features

**All users**
- Sign up as a **Traveler** or a **Companion** and log in. The JWT is kept in `localStorage`; expired tokens send you back to the login page, and each role only sees its own dashboard.
- Profile page with an edit form (changing your email or mobile number logs you out so the token is refreshed).

**Traveler** (`/traveler-dashboard`)
- Share-ride form (trip ID, driver name, driver phone, cab number, optional companion mobile). The ride is saved through the API, then WhatsApp (`wa.me`) opens with the details and a link to the trip. If the browser blocks the pop-up, a **Send details on WhatsApp** button is shown.
- Ride history with status, a live-view link, a re-share link, **End** to mark a ride completed, and inline 1-5 star feedback.
- Opening a trip (`/traveler-dashboard?tripId=...`) starts the trip simulation and streams the position to the companion over the WebSocket.

**Companion** (`/companion-dashboard`)
- Cards for every ride shared with your mobile number, refreshed every 10 seconds. A ride is *Active* until the traveler ends it or 60 minutes pass.
- **Follow on map** for active rides: the map follows the traveler's position when the traveler has the trip open.
- Notifications from the server when a trip is getting close to its destination and when it is complete.
- Inline 1-5 star feedback.

**Admin** (`/admin-dashboard`)
- Totals (travelers, companions, feedback, average rating), a users table and a feedback table.
- Admin accounts cannot be created from the sign-up form; the backend grants the admin role to the emails in `ADMIN_EMAILS`.

### About the map

The trip is a **simulation**: the marker moves in a straight line from Delhi to Hyderabad in about a minute (Leaflet with OpenStreetMap tiles). It does not use the device's GPS. Distance and ETA (at 60 km/h) are worked out from the simulated position.

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18 (Create React App), React Router 6, Axios, `jwt-decode`, Leaflet + react-leaflet (OpenStreetMap), Bootstrap 5 with a custom theme |
| Backend | Node.js 18+, Express 4, Sequelize 6 (`pg`), `jsonwebtoken`, `bcryptjs`, `express-validator`, `ws`, `dotenv`, `cors` |
| Database | PostgreSQL (Supabase in production); SQLite for local development and tests |
| Tests | Jest + Testing Library (frontend), `node:test` (backend API and WebSocket) |

## Project structure

```
Ride-Sharing-Platform/
├── backend/
│   ├── server.js            # checks config, connects the DB, starts HTTP + WebSocket
│   ├── app.js               # Express app (CORS, routes, errors)
│   ├── realtime.js          # authenticated trip WebSocket and companion notifications
│   ├── config/              # env helpers, Sequelize connection
│   ├── controllers/         # auth, user, ride, feedback, admin
│   ├── middleware/          # authMiddleware (JWT + requireRole), validate
│   ├── models/              # User, RideShare, Feedback
│   ├── routes/
│   └── test/                # API and WebSocket tests (in-memory SQLite)
├── public/
└── src/
    ├── App.js               # routes and role guards
    ├── config.js            # backend / frontend URLs
    ├── utils/               # auth session, geo, ride helpers
    └── components/          # Login, Signup, Navbar, TravelerDashboard, TravelerMap,
                             # RideSharingForm, RideHistory, FeedbackForm,
                             # CompanionDashboard, AdminDashboard, Profile
```

## Getting started

### Prerequisites

- Node.js 18 or newer and npm
- PostgreSQL (local or hosted), or nothing at all if you use the SQLite option for development

### Install

```bash
git clone https://github.com/VamsiKrishnaThota03/ride-share-safety.git
cd Ride-Sharing-Platform
npm install                         # also installs backend/ dependencies
cp .env.example .env                # frontend settings
cp backend/.env.example backend/.env
```

### Backend environment (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Long random string used to sign JWTs |
| `DATABASE_URL` | One DB option | Full PostgreSQL URL, for example `postgres://user:password@host:5432/postgres` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | One DB option | PostgreSQL connection parts (the Supabase pooler uses port `6543`) |
| `DB_SSL` | No | Unset: TLS with **certificate verification**. `no-verify`: TLS without verification (for a provider whose CA is not in Node's bundle). `false` / `disable`: no TLS, for a local or CI PostgreSQL |
| `DB_DIALECT`, `DB_STORAGE` | One DB option | `DB_DIALECT=sqlite` uses a local SQLite file (`DB_STORAGE`, default `dev.sqlite`). Local development only; `sqlite3` is an **optional** dependency because its native build fails on Python 3.12+ (node-gyp needs `distutils`, removed from the standard library). Install it with `npm install sqlite3` if you want the fallback |
| `ADMIN_EMAILS` | No | Comma-separated emails that get the admin role when they sign up |
| `CORS_ORIGIN` | No | Comma-separated allowed browser origins, for example `https://ride-sharing-platform-frontend.vercel.app`. Empty allows every origin |
| `PORT` | No | HTTP and WebSocket port, default `5001` |
| `HOST` | No | Bind address. Defaults to `127.0.0.1`, or `0.0.0.0` when a managed-platform marker (`RENDER`, `FLY_APP_NAME`, `RAILWAY_ENVIRONMENT`, `DYNO`) is present |
| `RATE_LIMIT_MAX` | No | Requests per IP per 15 minutes across all routes, default `600` |
| `AUTH_RATE_LIMIT_MAX` | No | Login/register attempts per IP+email per 15 minutes, default `20` |

The server exits with a clear message if `JWT_SECRET` or a database setting is missing, and creates the tables on start (`sequelize.sync()`).

Quick local setup without PostgreSQL:

```env
JWT_SECRET=any-long-random-string
DB_DIALECT=sqlite
DB_STORAGE=dev.sqlite
ADMIN_EMAILS=you@example.com
```

### Frontend environment (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | No | API base URL. Defaults to `http://localhost:5001` in development and `https://ride-sharing-platform-backend.onrender.com` in production builds. The WebSocket URL is derived from it |
| `REACT_APP_FRONTEND_URL` | No | Public URL used in shared WhatsApp links. Defaults to the site's own origin |

`REACT_APP_*` values are read at build time, so restart `npm start` (or redeploy) after changing them.

### Run

```bash
npm run both        # React dev server on :3000 and the API (nodemon) on :5001
```

Or separately: `npm run server` for the API and `npm start` for the client. Sign up with an email from `ADMIN_EMAILS` to get an admin account.

### Scripts

| Command | Description |
| --- | --- |
| `npm start` | React dev server |
| `npm run build` | Production build into `build/` |
| `npm test` | Frontend tests |
| `npm run server` / `npm run server:dev` | API with `node` / `nodemon` |
| `npm run both` | Frontend and API together |
| `npm --prefix backend test` | Backend API, WebSocket and hardening tests. Uses PostgreSQL when `TEST_DATABASE_URL` is set (as CI does), otherwise in-memory SQLite |
| `npm --prefix backend run test:coverage` | Same, with coverage |

## API

REST routes are prefixed with `/api`. Protected routes expect `Authorization: Bearer <token>`. Errors are returned as `{ "message": "..." }`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/` | none | Health check |
| `POST` | `/api/signup` | none | Register (`name`, `email`, `mobile_number` (10 digits), `password` (6+), `role`: `traveler` or `traveler_companion`) |
| `POST` | `/api/login` | none | Log in; returns `token`, `role`, `mobile_number` (companions also get `rideShareDetails`) |
| `GET` | `/api/user/profile` | any user | Current profile (password excluded) |
| `PUT` | `/api/user/profile` | any user | Update `name`, `email`, `mobile_number` |
| `POST` | `/api/rides/share` | `traveler` | Save a shared ride (`tripId`, `driverName`, `driverPhone`, `cabNumber`, `companionMobile`) |
| `GET` | `/api/rides/shared` | any user | Rides shared by the current user, newest first |
| `POST` | `/api/rides/expire` | `traveler` (owner) | Mark one of your rides as completed (`tripId`) |
| `GET` | `/api/rides/companion/details` | `traveler_companion` | Rides shared with your mobile number |
| `POST` | `/api/feedback/send` | `traveler`, `traveler_companion` | Feedback (`rideShareId` = trip ID, `rating` 1-5, `comment`) for a ride you shared or were the companion on |
| `GET` | `/api/admin/users` | `admin` | All users (passwords excluded) |
| `GET` | `/api/admin/feedbacks` | `admin` | All feedback |

### WebSocket

The WebSocket server runs on the same port. Every connection needs a valid token.

| URL | Who | Behaviour |
|-----|-----|-----------|
| `ws://<host>/?tripId=<id>&token=<jwt>` | Trip owner, its companion or an admin | Joins an active trip. The owner sends `{"type":"updatePosition","lat":..,"lon":..}` (relayed to the other viewers as `position`), `{"type":"nearby"}` and `{"type":"destinationReached"}` (marks the ride inactive). |
| `ws://<host>/?token=<jwt>` | Companion | Receives `nearbyNotification` and `tripComplete` messages for rides shared with them |

## Data model

| Model | Fields |
|-------|--------|
| `User` | `name`, `email` (unique), `mobile_number`, `password` (bcrypt hash), `role` (`traveler` / `traveler_companion` / `admin`) |
| `RideShare` | `tripId`, `driverName`, `driverPhone`, `cabNumber`, `companionMobile`, `userId`, `isActive` |
| `Feedback` | `rideShareId` (trip ID), `userId`, `rating` (1-5), `comment` |

## Security notes

- Earlier commits contained `backend/.env` with a database password and a JWT secret. The file is no longer tracked, but it is still in the git history, so rotate both.
- Admin accounts come only from `ADMIN_EMAILS`; the sign-up form cannot create them.

### Hardening

The API listener was `app.listen(PORT)` with no host, which binds **every**
interface — a development server was reachable from anyone on the same network.
It now defaults to `127.0.0.1`, detects managed platforms by their own
environment markers, and honours an explicit `HOST`. A CI job inspects the real
listening socket with `ss -ltn` rather than trusting the source, because a bind
is the kind of thing that regresses quietly.

Database TLS verification was off unconditionally
(`ssl: { require: true, rejectUnauthorized: false }`), which accepts any
certificate and therefore does not authenticate the server at all. Verification
is now the default; `DB_SSL=no-verify` keeps the old behaviour available for a
provider whose CA is not in Node's bundle, but it has to be asked for.

Also added:

- **helmet** with a deny-all CSP (this is a JSON API; nothing is loaded from it
  as a subresource), `nosniff` and `no-referrer`.
- **Rate limiting**, which the limitations list previously called out as
  missing: a global ceiling, plus a tighter one on the auth routes keyed on IP
  **plus the submitted email** so one attacker behind a shared address cannot
  lock out everyone else. It counts successes as well as failures, so a valid
  login cannot refill the budget. `trust proxy` is set to exactly one hop, so
  `X-Forwarded-For` cannot be spoofed to bypass it.
- **Split health probes.** `GET /health` is liveness and never touches the
  database, so a blip cannot cause a restart loop. `GET /health/ready` runs
  `authenticate()` and answers 503 with `Retry-After: 30`, without leaking the
  connection string.
- **Graceful shutdown** on SIGTERM/SIGINT that closes the WebSocket server, then
  the HTTP server, then Sequelize — so a deploy does not drop live trip streams.

### Continuous integration

| Job | What it proves |
| --- | --- |
| `backend` (Node 20, 22) | The full suite against a **PostgreSQL 16** service container — the dialect production actually uses, rather than SQLite |
| `bind-address` | Reads `ss -ltn` on the running server: no `0.0.0.0:5001` listener by default, a loopback one present, `HOST=0.0.0.0` still honoured, readiness turns green, and `SIGTERM` exits cleanly |
| `frontend` | 6 Jest + Testing Library tests and a production build |
| `docker` | The backend image builds and refuses to start without `JWT_SECRET` |

### Docker

```bash
printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\n' \
  "$(openssl rand -hex 16)" "$(openssl rand -hex 32)" > .env

docker compose up --build
```

Postgres and the API both publish to `127.0.0.1` only, so neither is reachable
from your network, and Compose fails fast with a named error if either variable
is missing.

## Known limitations

- The trip map is a simulated Delhi to Hyderabad route, not real GPS tracking, and the simulation restarts when the page is reloaded.
- Companions only get live positions while the traveler has the trip page open; otherwise they see the simulation.
- Companions are matched by mobile number, so the traveler must enter the number the companion registered with.
- Rides show as completed 60 minutes after they were shared, even if nobody ended them.
- JWTs live in `localStorage` and expire after one hour; there is no refresh token. (Login rate limiting now exists — see Hardening.)
- `npm audit` still reports issues inside `react-scripts` (Create React App) and Sequelize's `uuid` dependency that need breaking upgrades.
- Rate limit counters live in process memory, so the ceilings are per instance. Scaling past one would need a shared store (Redis).
- `sequelize.sync()` creates and alters tables on start. Fine for this project; a service holding real data wants migrations so a column rename cannot become a drop-and-recreate.


## Contact

Thota Vamsi Krishna — [GitHub](https://github.com/VamsiKrishnaThota03)
