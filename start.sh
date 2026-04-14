#!/bin/bash
# Start backend
cd /Users/Annichka/Capstone/intelligpa/backend
python3 -m uvicorn app.main:app --reload &

# Start frontend
cd /Users/Annichka/Capstone/intelligpa/frontend
npm run dev
