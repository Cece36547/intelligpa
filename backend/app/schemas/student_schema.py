from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from datetime import datetime
from typing import Optional

class StudentCreate(BaseModel):
    student_user_name: str
    current_gpa: Optional[float] = None # Students can start off with no GPA
    goal_gpa: float

    @field_validator("student_user_name") #Username must be > 6
    def validate_user_name(cls,user_name):
        if len(user_name) < 6:
            raise ValueError(f" User Name must be longer than 6 characters. ")
        return user_name
    
    @field_validator("goal_gpa")
    def validate_gpa(cls,gpa):
        if gpa < 0.0 or gpa > 4.0:
            raise ValueError(f"Grade Poing Average's must be between 0.0 and 4.0.")
        return gpa
    
    @model_validator(mode="after")
    def validate_gpa_relationship(self) -> "StudentCreate":
        if self.current_gpa is not None and self.goal_gpa is not None:
            if self.current_gpa > self.goal_gpa:
                raise ValueError("Currrent GPA cannot be greater than Goal GPA.")
            return self
        
class StudentResponse(BaseModel): 
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    current_gpa: Optional[float] = None
    student_user_name: str
    goal_gpa: float

class StudentUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    current_gpa: Optional[float] = None
    goal_gpa: Optional[float] = None

    @field_validator("current_gpa", "goal_gpa")
    def validate_gpa(cls, gpa: float) -> float:
        if gpa is None:
            return gpa
        if gpa < 0.0 or gpa > 4.0:
            raise ValueError(f"Grade Poing Average's must be between 0.0 and 4.0.")
        return gpa
    
    @model_validator(mode="after")
    def validate_gpa_relationship(self) -> "StudentUpdate":
        if self.current_gpa is not None and self.goal_gpa is not None:
            if self.current_gpa > self.goal_gpa:
                raise ValueError("Currrent GPA cannot be greater than Goal GPA.")
            return self
    




