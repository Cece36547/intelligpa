from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from app.database.base import Base

# Import all models so SQLAlchemy knows about them before create_all
from app.models.student import Student
from app.models.course import Course
from app.models.assignment import Assignment
from app.models.assignmentCategory import AssignmentCategory

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base.metadata.create_all(engine)

def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()