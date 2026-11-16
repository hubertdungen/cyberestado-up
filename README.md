# cyberestado-up

Web app for the Cyber-Estado UP project: a Node.js/Express backend (PostgreSQL, JWT auth, Socket.IO) and a React frontend styled with Tailwind CSS.

## Layout

- `backend/`: API server (`server.js`), SQL schemas and setup scripts (`scripts/init-db.js`, `create-user.js`, `setup-permissions.js`, `check-system.js`).
- `frontend/`: React app.
- `install.bat` / `start.bat`: Windows helpers to install dependencies and start both sides.

## Run

1. Install PostgreSQL and create a `backend/.env` with your database and JWT settings.
2. `cd backend && npm install && node scripts/init-db.js`
3. `cd frontend && npm install`
4. Start the API (`npm start` in `backend`) and the frontend (`npm start` in `frontend`), or run `start.bat` on Windows.

The in-app text is in Portuguese.

<p align="center"><a href="https://dlforge.dungenlabs.com"><img src="docs/branding/dlforge-logo.svg#gh-light-mode-only" alt="DL Forge" width="120"><img src="docs/branding/dlforge-logo-negative.svg#gh-dark-mode-only" alt="DL Forge" width="120"></a></p>
