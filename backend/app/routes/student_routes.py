from fastapi import APIRouter, UploadFile, File, HTTPException
from app.schemas.student_schema import StudentCreate, StudentResponse, StudentUpdate
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session


router = APIRouter(prefix='/student', tags=["Student"])

@router.post("/")
def createStudent(student: StudentCreate, db: Session = Depends(get_db)):
    return student

@router.get("/{student_user_name}")
def getStudent(student_user_name: str, db: Session = Depends(get_db)):
    student_user_name

@router.put("/{student_user_name}")
def updateStudent(student_user_name: str, update: StudentUpdate, db: Session = Depends(get_db)):


@router.delete("/{student_user_name}")
def deleteStudent(student_user_name: str, db: Session = Depends(get_db)):


