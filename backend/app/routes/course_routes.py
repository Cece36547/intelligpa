from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.course_schema import courseResponse, createCourse
from app.services.syllabus_service import process_syllabus
from app.models.student import Student
from app.models.course import Course
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix='/course', tags=["Course"])

@router.post("/course/{student_user_name}", response_model=courseResponse)
async def addCourse(student_user_name: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if student is None: #if student is not found, throw an error 
        raise HTTPException(status_code=404, detail="Student not found")
    

    if not file.filename.endswith(".pdf"):  #moving upload logic to createCourse endpoint
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
 
    file_bytes = await file.read()
 
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
 
    try:
        parsed = process_syllabus(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse syllabus: {str(e)}")
    
    new_course = Course(course_name=parsed["course_name"], instructor= parsed["instructor"])
    new_course.student_user_name = student.student_user_name
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

#@router.get("/{student_user_name}", response_model=courseResponse)
#def getClass(student_user_name: str, db: Session):
