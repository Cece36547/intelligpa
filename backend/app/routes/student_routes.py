from fastapi import APIRouter, HTTPException
from app.schemas.student_schema import StudentCreate, StudentResponse, StudentUpdate
from app.models.student import Student
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session


router = APIRouter(prefix='/student', tags=["Student"])

@router.post("/", response_model=StudentResponse)
def createStudent(student: StudentCreate, db: Session = Depends(get_db)):
    existing_student = db.query(Student).filter(
        Student.student_user_name == student.student_user_name
    ).first()

    if existing_student:
        raise HTTPException(status_code=409, detail="Student already exists")

    new_student = Student(**student.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/{student_user_name}", response_model=StudentResponse) 
def getStudent(student_user_name: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first() #querying database for student user name

    if student is None: #if student is not found, throw an error 
        raise HTTPException(status_code=404, detail="Student not found")
    return student
    

@router.put("/{student_user_name}", response_model=StudentResponse)
def updateStudent(student_user_name: str, update: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_user_name}")
def deleteStudent(student_user_name: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": f"Student {student_user_name} deleted successfully"}