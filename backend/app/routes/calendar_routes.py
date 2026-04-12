from app.models.course import Course
from app.schemas.calendar_schema import responseCalendar
from fastapi import APIRouter, HTTPException, Depends
from app.models.student import Student
from app.models.assignment import Assignment
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("/", response_model=list[responseCalendar])
def get_assignment_dates(user=Depends(verify_firebase_token), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid==user["uid"]).first()
    if student is None: #if student is not found
        raise HTTPException(status_code=404, detail="Student not found.")
    assignments = db.query(Assignment).join(Course).filter(Course.student_user_name == student.student_user_name, Assignment.due_date != None).order_by(Assignment.due_date).all()
    if not assignments:
        return []
    return assignments