from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.student import Student
from app.services.gpa_service import calculate_term_gpa, project_student_gpa, needed_average_for_target, simulate_course_what_if, monte_carlo_course_prediction
from app.models.course import Course
from pydantic import BaseModel, Field

router = APIRouter(prefix="/gpa", tags=["GPA"])
class SimulationScore(BaseModel):
    assignment_id: int
    score: float = Field(..., ge=0)
    max_score: float = Field(100, gt=0)


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

@router.get("/needed/{student_user_name}/{course_id}")
def needed_score(
    student_user_name: str,
    course_id: int,
    target: float = 90.0,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.student_user_name == student_user_name)
        .first()
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = (
        db.query(Course)
        .filter(
            Course.course_id == course_id,
            Course.student_user_name == student_user_name
        )
        .first()
    )

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return needed_average_for_target(course, target)

@router.post("/simulate/{student_user_name}/{course_id}")
def simulate_what_if(
    student_user_name: str,
    course_id: int,
    hypothetical_scores: list[SimulationScore],
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.student_user_name == student_user_name)
        .first()
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = (
        db.query(Course)
        .filter(
            Course.course_id == course_id,
            Course.student_user_name == student_user_name
        )
        .first()
    )

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return simulate_course_what_if(
    course,
    [score.model_dump() for score in hypothetical_scores]
)

@router.get("/predict/{student_user_name}/{course_id}")
def predict_course_outcome(
    student_user_name: str,
    course_id: int,
    simulations: int = 1000,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.student_user_name == student_user_name)
        .first()
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = (
        db.query(Course)
        .filter(
            Course.course_id == course_id,
            Course.student_user_name == student_user_name
        )
        .first()
    )

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if simulations < 100:
        simulations = 100

    if simulations > 5000:
        simulations = 5000

    return monte_carlo_course_prediction(course, simulations)