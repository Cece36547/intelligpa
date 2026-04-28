from pydantic import BaseModel, ConfigDict
from datetime import date
from app.schemas.assignmentCategory_schema import responseAssignmentCategory
from typing import Optional


class createAssignment(BaseModel):
    due_date: date
    assignment_type: str
    score: float
    max_score: float


class assignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str
    due_date: Optional[date] = None
    score: Optional[float] = None
    max_score: Optional[float] = None


class updateAssignmen(BaseModel):
    assignment_type: Optional[str]
    score: Optional[float]