from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.course_schema import courseResponse, updateCourse
from app.firebase_auth import verify_firebase_token
from app.services.syllabus_service import process_syllabus
from app.models.student import Student
from app.models.course import Course
from app.models.assignmentCategory import AssignmentCategory
from app.models.assignment import Assignment
from app.database.db import get_db
from fastapi import Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix='/course', tags=["Course"])

@router.post("/", response_model=courseResponse)
async def addCourse(user=Depends(verify_firebase_token), file: UploadFile = File(...), db: Session = Depends(get_db)):
    #Checking if Student exist 
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()
    if student is None: #if student is not found, throw an error 
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
    
    #Checking for duplicate courses
    existing_course = db.query(Course).filter(Course.student_user_name == student.student_user_name, Course.course_name == parsed["course_name"]).first()
    if existing_course:
        raise HTTPException(status_code=409, detail="Course already exists for this student")
    new_course = Course(
        course_name=parsed["course_name"],
        instructor=parsed["instructor"],
        student_user_name=student.student_user_name
    )
    db.add(new_course)
    db.commit()
    category_map = {} # Creating categories and store in dictionary for lookup
    for cat in parsed["assignment_categories"]:
        new_category = AssignmentCategory(category_name=cat["category_name"], weight=cat["weight_percent"], course_id=new_course.course_id)
        db.add(new_category)
        db.flush()
        category_map[cat["category_name"]] = new_category

    #Creating assignments using category_map to link them
    for assign in parsed["assignments"]:
        matched_category = category_map.get(assign["category_name"])
        new_assignment = Assignment(title=assign["title"], assignment_type=assign["type"], due_date=assign["due_date"], max_score=assign["max_points"], score=None, course_id=new_course.course_id, category_id=matched_category.category_id if matched_category else None)
        db.add(new_assignment)
        db.flush()
    db.commit()
    db.refresh(new_course)
    return new_course

@router.get("/", response_model=list[courseResponse])
def getClass(user=Depends(verify_firebase_token), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()
    if student is None: #if student is not found, throw an error 
        raise HTTPException(status_code=404, detail="Student not found")
    courses = db.query(Course).filter(Course.student_user_name == student.student_user_name).all() # return back all courses associated with specific student
    if not courses:
        return []
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

@router.delete("/{course_name}")
def deleteClass(course_name: str, user=Depends(verify_firebase_token), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    course = db.query(Course).filter(Course.student_user_name == student.student_user_name, Course.course_name == course_name).first()
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": f"Course {course_name} deleted successfully"}
