from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database.base import Base

class Course(Base):
    __tablename__ = "courses"
    course_id = Column(Integer, autoincrement=True, primary_key=True)
    course_name = Column(String)
    instructor = Column(String)
    student_user_name = Column(String, ForeignKey("students.student_user_name"))
    

    #Defined Relationships
    student = relationship("Student", back_populates="courses")
    assignments = relationship("Assignment", back_populates="course")
    category = relationship("AssignmentCategory", back_populates="course")
