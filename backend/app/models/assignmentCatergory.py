from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class AssignmentCategory(Base):
    __tablename__ = "assignment_categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    category_name = Column(String)
    weight = Column(Float)

    course_id = Column(Integer, ForeignKey("courses.course_id"))

    course = relationship("Course", back_populates="catergory")
    assignments = relationship("Assignment", back_populates="category")


   