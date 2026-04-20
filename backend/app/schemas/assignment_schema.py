from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime, date
from app.schemas.assignmentCategory_schema import responseAssignmentCategory
from typing import Optional


class createAssignment(BaseModel):
    title: str
    due_date: Optional[date] = None
    assignment_type: str
    score: Optional[float] = None
    max_score: Optional[float] = None
    @model_validator(mode="after")

    def validate_date(self) -> "createAssignment":
        if self.due_date is not None:
            if self.due_date < date.today():
                raise ValueError("Due date cannot be in the past.")
        return self

class assignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    title: str
    assignment_type: str
    due_date: Optional[date] = None
    score: Optional[float] = None
    max_score: Optional[float] = None

class updateAssignment(BaseModel):
    title: Optional[str] = None
    assignment_type: Optional[str] = None
    due_date: Optional[date] = None
    score: Optional[float] = None
    max_score: Optional[float] = None

    #Checking that when due date is updated its not updated to a past date
    @model_validator(mode="after")
    def validate_date(self) -> "updateAssignment":
        if self.due_date is not None:
            if self.due_date < date.today():
                raise ValueError("Due date cannot be in the past.")
        return self
    