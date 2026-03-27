from pydantic import BaseModel, ConfigDict
from sqlalchemy import Date
from typing import Optional

class createAssignment(BaseModel):
    due_date: Date
    assignment_type: str
    score: float
    max_score: float

class assignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    due_date: Date
    assignment_type: str
    score: float
    max_score: Optional[float]

class updateAssignmen(BaseModel):
    assignment_type: Optional[str]
    score: Optional[float]
