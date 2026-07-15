#!/usr/bin/env bash
# Run backend (FastAPI/uvicorn) and frontend (Next.js) dev servers together.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"

(cd "$root/backend" && ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000) &
backend_pid=$!

(cd "$root/frontend" && npm run dev) &
frontend_pid=$!

trap 'kill $backend_pid $frontend_pid 2>/dev/null' EXIT
wait
