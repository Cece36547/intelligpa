from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class Course(Base):
    __tablename__ = "courses"
    course_id = Column(Integer, primary_key=True, autoincrement=True)
    course_name = Column(String)
    student_user_name = Column(String, ForeignKey("students.student_user_name"))
    student = relationship("Student", back_populates = "courses")
    assignment = relationship("Assignment", back_populates= "course")
    catergory = relationship("AssignmentCategory", back_populates="course")
