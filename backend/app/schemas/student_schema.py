from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional

class StudentCreate(BaseModel):
    student_user_name: str
    current_gpa: Optional[float] = None # Students can start off with no GPA
    goal_gpa: float

    @field_validator("student_user_name") #Username must be > 6
    def validate_user_name(cls, user_name: str) -> str:
        if len(user_name) < 6:
            raise ValueError(f" User Name must be longer than 6 characters. ")
        return user_name
    
    @field_validator("goal_gpa")
    def validate_gpa(cls, gpa: float) -> float:
        if gpa < 0.0 or gpa > 4.0:
            raise ValueError(f"Grade Poing Average's must be between 0.0 and 4.0.")
        return gpa
    
    
class StudentResponse(BaseModel): 
    model_config = ConfigDict(from_attributes=True)
    current_gpa: Optional[float]
    created_at: datetime
    student_user_name: str
    goal_gpa: float
    email: Optional[str] = None
    firebase_uid: Optional[str] = None

class StudentUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    current_gpa: Optional[float]
    goal_gpa: Optional[float]

    @classmethod
    @field_validator("current_gpa", "goal_gpa")
    def validate_gpa(cls, gpa: float) -> float:
        if gpa < 0.0 or gpa > 4.0:
            raise ValueError(f"Grade Poing Average's must be between 0.0 and 4.0.")
        return gpa
    
