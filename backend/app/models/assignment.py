from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database.base import Base

class Assignment(Base):
    __tablename__ = "assignments"
    assignment_id = Column(Integer, primary_key = True)
    due_date = Column(Date)
    assignment_type = Column(String)
    score = Column(Float)
    max_score = Column(Float)
    course_id = Column(Integer, ForeignKey("courses.course_id"))
    category_id = Column(Integer, ForeignKey("assignment_categories.category_id"))
    
    #Defined Relationship
    course = relationship("Course", back_populates="assignments")
    category = relationship("AssignmentCategory", back_populates="assignments")