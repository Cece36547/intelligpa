from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class createCalendar(BaseModel):
    title: str
    due_date: Optional[date] = None
    assignment_type: Optional[str] = None
    course_id: int

class responseCalendar(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str
    due_date: Optional[date] = None
    assignment_type: Optional[str] = None
    course_id: int

class updateCalendar(BaseModel):
    due_date: Optional[date] = None

