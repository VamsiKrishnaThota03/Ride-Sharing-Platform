# Ride-Sharing Platform

A full-stack ride-safety sharing app: travelers share their cab details with a companion, companions follow the trip and leave feedback, and admins review users and feedback.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6.x-52B0E7?logo=sequelize&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)

## Overview

This repository holds the **original monorepo** version of the project: a Create React App frontend in the root and an Express/Sequelize backend in `backend/`. Everything is set up to run locally (`localhost:3000` for the client, `localhost:5001` for the API).

The app has three roles:

- **Traveler**: shares the details of an ongoing cab ride (trip ID, driver, phone, cab number) with a companion
- **Traveler Companion**: sees rides shared with their mobile number, opens the trip map and leaves feedback
- **Admin**: views all registered users and all feedback

### Related repositories

The project was later split into two repositories for separate deployment. Those versions read the backend URL from the environment and connect to a hosted PostgreSQL database over SSL.

| Repository | What it contains |
|------------|------------------|
| [Ride-Sharing-Platform](https://github.com/VamsiKrishnaThota03/Ride-Sharing-Platform) | **This repo**: frontend + backend together, localhost setup |
| [ride-sharing-platform-frontend](https://github.com/VamsiKrishnaThota03/ride-sharing-platform-frontend) | Standalone React client ([live demo](https://ride-sharing-platform-frontend.vercel.app)) |
| [ride-sharing-platform-backend](https://github.com/VamsiKrishnaThota03/ride-sharing-platform-backend) | Standalone Express API |

## Features

**Authentication**
- Sign-up with bcrypt-hashed passwords, and login that returns a JWT valid for 1 hour
- Role-based route protection on the backend (`traveler`, `traveler_companion`, `admin`)
- After login, each role is redirected to its own dashboard

**Traveler**
- Share-ride form. It saves the ride through the API, then opens WhatsApp (`wa.me`) with a pre-filled message containing the ride details and a shareable trip link.
- "Your Shared Rides" table (audit trail of the traveler's active shared rides)
- Leaflet / OpenStreetMap trip view

**Traveler Companion**
- Cards for every ride shared with the companion's mobile number, refreshed every 10 seconds
- Each ride is shown as *Active* or *Expired* (more than 60 minutes after it was shared)
- "View Map" link for active trips and "Give Feedback" (rating plus comment), which is stored for the admin
- A notifications panel that listens on a WebSocket for `tripComplete` / `nearbyNotification` events. The backend does not send these events yet.

**Admin**
- Lists of all users and all feedback

**Real-time**
- The WebSocket server (`ws`) accepts a connection only for an active `tripId`
- When the map reports `destinationReached`, the backend marks the trip inactive, so the shared ride expires

> **Note:** the trip map is a simulation. The marker moves from a fixed start point (Delhi) to a fixed destination (Hyderabad) and does not use live GPS.

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18 (Create React App), React Router 6, Axios, Leaflet / react-leaflet, moment-timezone, Bootstrap / react-bootstrap, CSS |
| Backend | Node.js, Express, Sequelize, `ws`, `jsonwebtoken`, `bcrypt`, `cors`, `dotenv` |
| Database | PostgreSQL |

## Project structure

```
Ride-Sharing-Platform/
├── public/                    # CRA static assets
├── src/                       # React frontend
│   ├── App.js                 # Routes
│   └── components/            # Login, Signup, Navbar, Profile, dashboards, map, ride form/history
├── backend/
│   ├── server.js              # Express app + WebSocket server (port 5001)
│   ├── config/db.js           # Sequelize / PostgreSQL connection
│   ├── models/                # User, RideShare, Feedback
│   ├── controllers/           # auth, ride, feedback, admin, user
│   ├── routes/                # /api, /api/rides, /api/feedback, /api/admin
│   ├── middleware/            # JWT + role checks
│   └── utils/jwtUtils.js
└── package.json               # Frontend dependencies and scripts
```

## Getting started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL running locally (create an empty database, for example `ride_sharing_app`)

### 1. Backend

`backend/` has no `package.json` of its own, so install its dependencies first:

```bash
cd backend
npm init -y
npm install express body-parser cors dotenv sequelize pg pg-hstore bcrypt jsonwebtoken ws
node server.js            # http://localhost:5001
```

Tables are created automatically on startup (`sequelize.sync()`).

Create `backend/.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `ride_sharing_app` |
| `DB_USER` | Database user | `<your-db-user>` |
| `DB_PASSWORD` | Database password | `<your-db-password>` |
| `JWT_SECRET` | Secret used to sign JWTs | `<a-long-random-string>` |
| `PORT` | Not used yet; the server listens on 5001 | `5001` |

### 2. Frontend

From the repository root:

```bash
npm install
npm start                 # http://localhost:3000
```

Root `.env` (optional; the components in this version call `http://localhost:5001` directly):

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend base URL | `http://localhost:5001` |

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the React dev server |
| `npm run build` | Production build into `build/` |
| `npm test` | CRA test runner |

## API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/signup` | none | Register a user (`name`, `email`, `mobile_number`, `password`, `role`) |
| `POST` | `/api/login` | none | Log in and get a JWT (companions also receive their shared rides) |
| `GET` | `/api/user/profile` | logged in | Current user's profile |
| `POST` | `/api/rides/share` | logged in | Save a shared ride |
| `GET` | `/api/rides/shared` | logged in | Current user's active shared rides |
| `GET` | `/api/rides/companion/details` | `traveler_companion` | Rides shared with the companion's mobile number |
| `POST` | `/api/feedback/send` | `traveler_companion` | Submit feedback (`rideShareId`, `rating`, `comment`) |
| `GET` | `/api/admin/users` | `admin` | List all users |
| `GET` | `/api/admin/feedbacks` | `admin` | List all feedback |
| `WS` | `ws://localhost:5001/?tripId=<id>` | n/a | Trip channel; `{"type":"destinationReached"}` marks the trip inactive |

## Possible improvements

- Use real device geolocation instead of the simulated route
- Have the server send companion notifications (trip complete, geofence near drop-off)
- SMS sharing in addition to WhatsApp
- Ride analytics for admins and ratings for drivers

## Contact

Thota Vamsi Krishna — [GitHub](https://github.com/VamsiKrishnaThota03)
