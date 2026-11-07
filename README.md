# TodoApp Frontend

This directory is the standalone React frontend for TodoApp.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

The Vite development server proxies `/api`, `/auth`, `/invite`, and `/settings` to the FastAPI server at `http://localhost:8000`. Start the backend separately:

```powershell
uvicorn main:app --reload --port 8000
```

For a different backend URL, create `.env.local`:

```text
VITE_API_URL=http://localhost:8000
```

## Build

```powershell
npm.cmd run build
```

The generated production files are written to `dist/`.

`src/` contains the running React application. `original-ui/` contains the original Jinja/static UI for reference only; it is not loaded by Vite.
