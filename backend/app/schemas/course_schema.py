from pydantic import BaseModel, ConfigDict
from typing import Optional

from app.schemas.assignment_schema import assignmentResponse
from app.schemas.assignmentCategory_schema import responseAssignmentCategory


class createCourse(BaseModel):
    course_name: str
    instructor: Optional[str] = None


class updateCourse(BaseModel):
    course_name: Optional[str] = None
    instructor: Optional[str] = None
    credits: Optional[int] = None


class courseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    course_id: int
    course_name: str
    instructor: Optional[str] = None
    credits: Optional[int] = 3

    assignments: Optional[list[assignmentResponse]] = None
    categories: Optional[list[responseAssignmentCategory]] = None