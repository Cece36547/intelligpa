from fastapi import APIRouter, HTTPException
from app.schemas.student_schema import StudentCreate, StudentResponse, StudentUpdate
from app.models.student import Student
from app.database.db import get_db
from fastapi import Depends
from app.firebase_auth import verify_firebase_token
from sqlalchemy.orm import Session


router = APIRouter(prefix='/student', tags=["Student"])

@router.post("/", response_model=StudentResponse)
def createStudent(
    student: StudentCreate,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    existing_student = db.query(Student).filter(
        Student.firebase_uid == user["uid"]
    ).first()

    if existing_student:
        raise HTTPException(status_code=409, detail="Student already exists")

    new_student = Student(
        student_user_name=student.student_user_name,
        current_gpa=student.current_gpa,
        goal_gpa=student.goal_gpa,
        firebase_uid=user["uid"],
        email=user.get("email")
    )

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

@router.put("/{student_user_name}/firebase", response_model=StudentResponse)
def linkFirebaseUid(student_user_name: str, firebase_uid: str, email: str = None, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.firebase_uid = firebase_uid
    if email:
        student.email = email
    db.commit()
    db.refresh(student)
    return student