from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.firebase_auth import verify_firebase_token
from app.models.assignment import Assignment
from app.models.assignmentCategory import AssignmentCategory
from app.models.course import Course
from app.models.student import Student
from app.schemas.course_schema import courseResponse, updateCourse
from app.services.syllabus_service import process_syllabus

router = APIRouter(prefix="/course", tags=["Course"])


@router.post("/", response_model=courseResponse)
async def addCourse(
    user=Depends(verify_firebase_token),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()

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

    course_name = parsed.get("course_name") or "Parsed Syllabus Course"
    instructor = parsed.get("instructor")

    existing_course = db.query(Course).filter(
        Course.student_user_name == student.student_user_name,
        Course.course_name == course_name,
    ).first()

    if existing_course:
        raise HTTPException(status_code=409, detail="Course already exists for this student")

    new_course = Course(
        course_name=course_name,
        instructor=instructor,
        student_user_name=student.student_user_name,
    )

    db.add(new_course)
    db.flush()

    category_map = {}

    for cat in parsed.get("assignment_categories", []):
        category_name = cat.get("category_name")
        weight = cat.get("weight_percent")

        if not category_name:
            continue

        new_category = AssignmentCategory(
            category_name=category_name,
            weight=weight,
            course_id=new_course.course_id,
        )

        db.add(new_category)
        db.flush()

        category_map[category_name.lower()] = new_category.category_id

    for assignment in parsed.get("assignments", []):
        title = assignment.get("title") or "Untitled Assignment"
        assignment_type = assignment.get("type")
        due_date_raw = assignment.get("due_date")
        max_score = assignment.get("max_points") or assignment.get("points") or 100
        category_name = assignment.get("category_name")

        parsed_due_date = None
        if due_date_raw:
            try:
                parsed_due_date = datetime.strptime(due_date_raw, "%Y-%m-%d").date()
            except ValueError:
                parsed_due_date = None

        category_id = None
        if category_name:
            category_id = category_map.get(category_name.lower())

        new_assignment = Assignment(
            title=title,
            assignment_type=assignment_type,
            due_date=parsed_due_date,
            score=None,
            max_score=max_score,
            course_id=new_course.course_id,
            category_id=category_id,
        )

        db.add(new_assignment)

    db.commit()
    db.refresh(new_course)

    return new_course


@router.get("/", response_model=list[courseResponse])
def getClass(user=Depends(verify_firebase_token), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    courses = db.query(Course).filter(
        Course.student_user_name == student.student_user_name
    ).all()

    if not courses:
        return []

    return courses


@router.put("/{course_id}", response_model=courseResponse)
def updateCourseRoute(
    course_id: int,
    update: updateCourse,
    db: Session = Depends(get_db),
):
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

@router.delete("/id/{course_id}")
def deleteCourseById(
    course_id: int,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(
        Course.course_id == course_id,
        Course.student_user_name == student.student_user_name
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()

    return {"message": f"Course {course_id} deleted successfully"}
@router.delete("/{course_name}")
def deleteClass(
    course_name: str,
    user=Depends(verify_firebase_token),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.firebase_uid == user["uid"]).first()

    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(Course).filter(
        Course.student_user_name == student.student_user_name,
        Course.course_name == course_name,
    ).first()

    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()

    return {"message": f"Course {course_name} deleted successfully"}