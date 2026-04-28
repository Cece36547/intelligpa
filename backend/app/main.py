from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from app.routes import gpa_routes, assignment_routes, course_routes, student_routes, syllabus_routes, calendar_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gpa_routes.router)
app.include_router(assignment_routes.router)
app.include_router(course_routes.router)
app.include_router(student_routes.router)
app.include_router(syllabus_routes.router)
app.include_router(calendar_routes.router)

@app.get("/")
def root():
    return {"message": "PathGPA Backend Running"}