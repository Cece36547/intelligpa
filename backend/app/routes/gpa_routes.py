from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.student import Student
from app.services.gpa_service import calculate_term_gpa, project_student_gpa

router = APIRouter(prefix="/gpa", tags=["GPA"])


@router.post("/term")
def term_gpa(courses: list[dict]):
    return {"term_gpa": calculate_term_gpa(courses)}


@router.get("/project/{student_user_name}")
def projected_gpa(student_user_name: str, db: Session = Depends(get_db)):
    student = (
        db.query(Student)
        .filter(Student.student_user_name == student_user_name)
        .first()
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    return project_student_gpa(student)