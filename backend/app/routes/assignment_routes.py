from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.db import get_db
from app.models.assignment import Assignment
from app.models.student import Student
from app.models.course import Course
from app.schemas.assignment_schema import createAssignment, assignmentResponse, updateAssignment
from app.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/assignment", tags=["Assignment"])


class AssignmentScoreUpdate(BaseModel):
    score: float
    max_score: float


@router.put("/{assignment_id}/score")
def update_assignment_score(
    assignment_id: int,
    update: AssignmentScoreUpdate,
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(
        Assignment.assignment_id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.score = update.score
    assignment.max_score = update.max_score

    db.commit()
    db.refresh(assignment)

    return {"message": "Assignment updated successfully"}


@router.post("/{course_name}", response_model=assignmentResponse)
def addAssignment(
    course_name: str,
    assignment: createAssignment,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db),
):
    exists = db.query(Course).join(Student).filter(
        Student.firebase_uid == user["uid"],
        Course.course_name == course_name
    ).first()

    if exists is None:
        raise HTTPException(status_code=404, detail="Student or course not found")

    q_assignment = db.query(Assignment).filter(
        Assignment.title == assignment.title,
        Assignment.course_id == exists.course_id
    ).first()

    if q_assignment:
        raise HTTPException(status_code=409, detail="Assignment already exists")

    new_assignment = Assignment(
        title=assignment.title,
        due_date=assignment.due_date,
        assignment_type=assignment.assignment_type,
        score=assignment.score,
        max_score=assignment.max_score,
        course_id=exists.course_id,
    )

    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment


@router.put("/{course_name}/{title}", response_model=assignmentResponse)
def updateAssignmentByTitle(
    course_name: str,
    title: str,
    update: updateAssignment,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db),
):
    exists = db.query(Course).join(Student).filter(
        Student.firebase_uid == user["uid"],
        Course.course_name == course_name
    ).first()

    if exists is None:
        raise HTTPException(status_code=404, detail="Student or course not found")

    q_assignment = db.query(Assignment).filter(
        Assignment.title == title,
        Assignment.course_id == exists.course_id
    ).first()

    if q_assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    for field, value in update.model_dump(exclude_none=True).items():
        setattr(q_assignment, field, value)

    db.commit()
    db.refresh(q_assignment)
    return q_assignment


@router.delete("/{course_name}/{title}")
def deleteClass(
    course_name: str,
    title: str,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    existing_course = db.query(Course).filter(
        Course.student_user_name == student.student_user_name,
        Course.course_name == course_name
    ).first()

    if existing_course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    assignment = db.query(Assignment).filter(
        Assignment.title == title,
        Assignment.course_id == existing_course.course_id
    ).first()

    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()

    return {"message": f"Assignment {title} deleted successfully"}