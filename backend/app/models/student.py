from sqlalchemy import Column, Integer, String, Float, ForiegnKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class Student(Base):
    __tablename__ = "students"
    student_id = Column(Integer, primary_key = True, autoincrement = True)   
    student_user_name = Column(String)
    current_gpa = Column(Float)
    goal_gpa = Column(Float)
    created_at = Column(DateTime,default = func.now())