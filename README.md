# College Transport

Students browse bus routes, request a bus pass, and check approval. The transport office manages buses, routes and requests.

- **Frontend:** Angular 17 (standalone components, signals)
- **Backend:** Node.js + Express REST API
- **Storage:** JSON files in `backend/data/` (no database to install)

## What you need

- Node.js 18 or newer (check with `node -v`)

## Run it (two terminals)

**1. Backend**
```
cd backend
npm install
npm start
```
API runs at http://localhost:3000

**2. Frontend**
```
cd frontend
npm install
npm start
```
Open http://localhost:4200 (the dev server forwards `/api` calls to port 3000).

## Admin login

Username `admin`, password `admin123`. Created automatically on the first backend start.
Change the password before real use: delete `backend/data/users.json` (set contents to `[]`), edit the default in `backend/server.js`, and restart. Set `JWT_SECRET` in the environment for any real deployment.

## Single-server mode (optional)

```
cd frontend && npm run build
cd ../backend && npm start
```
Express then serves the built Angular app at http://localhost:3000.

## Project layout

```
backend/
  server.js            all API routes, validation, auth
  db.js                reads/writes the JSON files
  data/
    buses.json         bus number, seats, driver, status
    routes.json        route name, bus, fare, stops with times
    registrations.json student bus-pass requests
    users.json         admin account (password stored hashed)
frontend/src/app/
  pages/               home (route search), register, status, login, admin
  services/            api.service.ts, auth.service.ts (JWT + guard)
```

## API summary

| Method | Path | Access |
|---|---|---|
| POST | /api/auth/login | public |
| GET | /api/routes | public |
| POST / PUT / DELETE | /api/routes[/:id] | admin |
| GET / POST / PUT / DELETE | /api/buses[/:id] | admin |
| POST | /api/registrations | public |
| GET | /api/registrations/status/:rollNo | public |
| GET / PATCH / DELETE | /api/registrations[/:id] | admin |
| GET | /api/stats | admin |

## Rules the backend enforces

- One active request per roll number (a rejected one can be re-sent).
- A request can only be approved if the route has an active bus with a free seat.
- A bus assigned to a route, or a route with active requests, cannot be deleted.
