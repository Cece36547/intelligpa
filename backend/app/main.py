from fastapi import FastAPI
from app.routes import gpa_routes, assignment_routes, course_routes, student_routes, syllabus_routes

app = FastAPI()

app.include_router(gpa_routes.router)
app.include_router(assignment_routes.router)
app.include_router(course_routes.router)
app.include_router(student_routes.router)
app.include_router(syllabus_routes.router)

@app.get("/")
def root():
    return {"message": "PathGPA Backend Running"}