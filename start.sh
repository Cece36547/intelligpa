#!/bin/bash

# Get the directory where this script lives
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start backend
cd "$ROOT/backend"
python3 -m uvicorn app.main:app --reload &

# Start frontend
cd "$ROOT/frontend"
npm run dev
