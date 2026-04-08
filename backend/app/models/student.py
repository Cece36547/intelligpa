from sqlalchemy import Column,String, Float, DateTime, func
from sqlalchemy.orm import relationship
from app.database.base import Base

class Student(Base):
    __tablename__ = "students"
    student_user_name = Column(String(50), primary_key=True)
    current_gpa = Column(Float)
    goal_gpa = Column(Float)
    created_at = Column(DateTime,default = func.now())
    
    #Defined Relationship
    courses = relationship("Course", back_populates="student")