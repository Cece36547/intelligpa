from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.course_schema import courseResponse, createCourse, updateCourse
from app.services.syllabus_service import process_syllabus
from app.models.student import Student
from app.models.course import Course
from app.models.assignment import Assignment
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix='/course', tags=["Course"])

@router.post("/course/{student_user_name}", response_model=courseResponse)
async def addCourse(student_user_name: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if not file.filename.endswith(".pdf"):
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
    existing_course = db.query(Course).filter(
        Course.student_user_name == student_user_name,
        Course.course_name == parsed["course_name"]
    ).first()
    if existing_course:
        raise HTTPException(status_code=409, detail="Course already exists for this student")
    new_course = Course(
        course_name=parsed["course_name"],
        instructor=parsed["instructor"],
        student_user_name=student.student_user_name
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@router.get("/course/{student_user_name}", response_model=list[courseResponse])
def getClass(student_user_name: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_user_name == student_user_name).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    courses = db.query(Course).filter(Course.student_user_name == student_user_name).all()
    return courses

@router.put("/{course_id}", response_model=courseResponse)
def updateCourseRoute(course_id: int, update: updateCourse, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if update.course_name is not None:
        course.course_name = update.course_name
    if update.instructor is not None:
        course.instructor = update.instructor
    if update.credits is not None:
        course.credits = update.credits
    db.commit()
    db.refresh(course)
    return course

@router.delete("/{course_id}")
def deleteCourse(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for cat in course.categories:
        db.query(Assignment).filter(Assignment.category_id == cat.category_id).delete()
        db.delete(cat)
    db.query(Assignment).filter(Assignment.course_id == course_id).delete()
    db.delete(course)
    db.commit()
    return {"message": f"Course {course_id} deleted successfully"}