from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.syllabus_service import process_syllabus

router = APIRouter(prefix='/syllabus', tags=["Syllabus"])

@router.post("/upload")
async def upload_syllabus(file: UploadFile = File(...)):
    """
    Accept a syllabus PDF upload and return structured course data:
    - Course name & instructor
    - Assignment categories with weights
    - Individual assignments/exams with due dates and point values
    """
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
 
    return {
        "message": "Syllabus parsed successfully.",
        "data": parsed,
    }