from fastapi import APIRouter, HTTPException
from app.schemas.student_schema import StudentCreate, StudentResponse, StudentUpdate
from app.models.student import Student
from app.database.db import get_db
from fastapi import Depends
from app.firebase_auth import verify_firebase_token
from sqlalchemy.orm import Session


router = APIRouter(prefix='/student', tags=["Student"])

@router.post("/", response_model=StudentResponse)
def createStudent(student: StudentCreate, db: Session = Depends(get_db)):
    new_student = Student(**student.model_dump()) 
    db.add(new_student) 
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/", response_model=StudentResponse) 
def getStudent(user=Depends(verify_firebase_token), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first() #querying database for student user name

    if student is None: #if student is not found, throw an error 
        raise HTTPException(status_code=404, detail="Student not found")
    return student
    

@router.put("/", response_model=StudentResponse)
def updateStudent(update: StudentUpdate, user=Depends(verify_firebase_token),db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/")
def deleteStudent(user=Depends(verify_firebase_token) , db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": f"Student deleted successfully"}