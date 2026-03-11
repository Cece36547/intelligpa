from fastapi import APIRouter
from app.services.gpa_service import calculate_term_gpa

router = APIRouter(prefix = "/gpa", tags = ["GPA"])

@router.post("/term")
def term_gpa(courses: list[dict]):
    return{"term_gpa": calculate_term_gpa(courses)}