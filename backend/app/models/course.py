from sqlalchemy import Column, Integer, String, Float, ForiegnKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, autoincrement=True)
    course_name = Column(String)

    student_id = Column(Integer, ForiegnKey("students.student_id"))
    student = relationship("Student", back_populates = "courses")
    assignment = relationship("Assignment", back_populates= "courses")