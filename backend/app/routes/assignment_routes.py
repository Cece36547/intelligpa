from fastapi import APIRouter, HTTPException
from app.schemas.assignment_schema import createAssignment,assignmentResponse, updateAssignment
from app.models.assignment import Assignment
from app.models.student import Student
from app.models.course import Course
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix='/assignment', tags=["Assignment"])

@router.post("/{student_user_name}/{course_name}")
def addAssignment(student_user_name: str, course_name: str, assignment: createAssignment, db: Session = Depends(get_db)):
    exists = db.query(Course).join(Student).filter(Student.student_user_name == student_user_name,Course.course_name == course_name).first()
    if exists is None:
        raise HTTPException(status_code=404, detail="Student or course not found")
    q_assignment = db.query(Assignment).filter(Assignment.title == assignment.title,Assignment.course_id == exists.course_id).first()
    if q_assignment:
        raise HTTPException(status_code=409, detail="Assignment already exists")
    new_assignment = Assignment(title=assignment.title,due_date=assignment.due_date,assignment_type=assignment.assignment_type,score=assignment.score,max_score=assignment.max_score,course_id=exists.course_id)
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.put("/{student_user_name}/{course_name}/{title}", response_model=assignmentResponse)
def updateAssignment(student_user_name: str, course_name: str, title: str, update: updateAssignment, db: Session = Depends(get_db)):
    exists = db.query(Course).join(Student).filter(
        Student.student_user_name == student_user_name,
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


@router.delete("/{student_user_name}/{course_name}/{title}")
def deleteClass(student_user_name: str,course_name: str,title: str,db: Session=Depends(get_db)):
    #Checking if student exists
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if student is None: #if student is not found, throw an error 
        raise HTTPException(status_code=404, detail="Student not found")
    #Checking if Course exists
    existing_course = db.query(Course).filter(Course.student_user_name == student_user_name, Course.course_name == course_name).first()
    if existing_course is None: #
        raise HTTPException(status_code=404, detail="Course not found ")
    
    #Checking if Assignment Exist
    assignment = db.query(Assignment).filter(Assignment.title == title).first()
    if assignment is None: 
        raise HTTPException(status_code=404, detail="Assignment not found ")
    db.delete(assignment)
    db.commit()
    return {"message": f"Assignment {title} deleted successfully"}