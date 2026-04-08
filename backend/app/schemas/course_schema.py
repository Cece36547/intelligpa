from pydantic import BaseModel, ConfigDict
from app.schemas.assignment_schema import assignmentResponse
from typing import Optional

class createCourse(BaseModel):
    course_name: str
    instructor : str

class courseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    course_name: str
    instructor:Optional[str] = None
    course_id: int
    assignment: Optional[list[assignmentResponse]] = None
    categories: Optional[list[assignmentResponse]] = None


    