# IntelliGPA

## Project Overview

IntelliGPA is an AI-powered academic management platform designed to help students organize coursework, track grades, manage assignments, and visualize academic progress in one centralized dashboard.

The platform combines traditional productivity tools with intelligent automation to reduce the manual work students face when managing multiple classes, deadlines, and GPA calculations.

# Features

* AI-powered syllabus parsing using Groq API
* GPA tracking and visualization
* What-if GPA simulation tools
* Monte Carlo / probabilistic grade prediction
* Assignment and coursework management
* Academic calendar integration
* Firebase Authentication
* Course and grade analytics dashboard

# Core Functionality

## AI Syllabus Parsing

Students can upload syllabus PDFs and IntelliGPA automatically extracts:

* Assignment names
* Assignment categories
* Due dates
* Exams and quizzes
* Grade weights
* Important deadlines
The extracted data is converted into structured coursework and calendar information.

## GPA Prediction & Simulation

The platform allows students to:

* Track current GPA
* Simulate hypothetical grades
* Predict future course outcomes
* Analyze GPA impact from assignments
* Visualize academic progress

IntelliGPA uses weighted grading logic and probabilistic prediction modeling to estimate future academic outcomes.

---

## Assignment & Calendar Management

Users can:

* Track assignments and deadlines
* Monitor coursework progress
* Organize academic schedules
* Visualize upcoming due dates
* Manage courses and grading structures

---

# Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* FastAPI
* Python
* SQLAlchemy

## Database

* MySQL

## Services & APIs

* Firebase Authentication
* Groq API

---

# Installation & Setup

## 1. Clone Repository

```bash
git clone https://github.com/Cece36547/intelligpa.git
```

---

## 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```bash
http://localhost:3000
```

---

## 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend runs on:

```bash
http://127.0.0.1:8000
```
## API Documentation

When the backend is running locally, FastAPI Swagger documentation is available at:

http://127.0.0.1:8000/docs

---

# Environment Variables

Create a `.env` file inside the backend directory:

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=your_database_url
```

For local testing, SQLite can be used:

DATABASE_URL=sqlite:///./intelligpa.db
``` 

# Contributors

* Daniel Ojo
* Anna Chapko
* Cierra Blackett

---

# Future Improvements

* Improved syllabus parsing accuracy
* Advanced Bayesian prediction modeling
* Enhanced calendar synchronization
* Mobile application support
* Personalized academic recommendations

---

# Project Goal

IntelliGPA aims to simplify academic organization by combining productivity tools with AI-driven automation, helping students make more informed academic decisions throughout the semester.
