from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class createCourse(BaseModel):
    course_name: str

class courseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    course_id: int
    course_name: str
    