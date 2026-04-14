from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ← add this
from app.routes import gpa_routes, assignment_routes, course_routes, student_routes, syllabus_routes

app = FastAPI()

# ← add this block
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gpa_routes.router)
app.include_router(assignment_routes.router)
app.include_router(course_routes.router)
app.include_router(student_routes.router)
app.include_router(syllabus_routes.router)

@app.get("/")
def root():
    return {"message": "PathGPA Backend Running"}