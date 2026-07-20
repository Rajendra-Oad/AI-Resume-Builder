# AI Resume Builder frontend

The frontend follows the feature-based architecture in `docs/04_Frontend_Architecture.md`.
It provides a responsive landing page, authentication flow, protected dashboard, resume list,
and resume editor backed by the current Spring API.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The development server runs on http://localhost:5173. By default, browser requests use
the same-origin `/api` path and Vite proxies them to the backend. This is important because
authentication restoration uses an HttpOnly refresh cookie.

Only configure the server-side proxy target when the backend is not on localhost:8080:

```env
VITE_DEV_PROXY_TARGET=http://localhost:8080
```

For testing from a phone connected to the same Wi-Fi, open the computer's LAN IPv4
address on port 5173. Keep `VITE_API_BASE_URL` unset: the phone calls `/api` on the
frontend origin and Vite forwards it to the backend without exposing a cross-site cookie.

## Quality commands

```bash
npm run lint
npm run test
npm run build
```

## Structure

- `src/features/` owns feature UI and API modules.
- `src/components/` holds shared UI primitives.
- `src/api/` is the single Axios configuration and error-normalization boundary.
- `src/context/` contains the in-memory auth session; tokens are never persisted to local storage.
- `src/routes/` defines lazy-loaded routes and guest/protected guards.
