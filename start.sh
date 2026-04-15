#!/bin/bash
# Start backend
cd "$(dirname "$0")/backend"
python3 -m uvicorn app.main:app --reload &

# Start frontend
cd "$(dirname "$0")/frontend"
npm run dev
