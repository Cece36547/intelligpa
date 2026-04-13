from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Course(Base):
    __tablename__ = "courses"
    course_id = Column(Integer, autoincrement=True, primary_key=True)
    course_name = Column(String(255))
    instructor = Column(String(255))
    credits = Column(Integer, default=3)
    student_user_name = Column(String(50), ForeignKey("students.student_user_name"))

    # Defined Relationships
    student = relationship("Student", back_populates="courses")
    assignments = relationship("Assignment", back_populates="course")
    categories = relationship("AssignmentCategory", back_populates="course")