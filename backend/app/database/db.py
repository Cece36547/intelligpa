from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from app.database.base import Base
from dotenv import load_dotenv

#Configurating Database
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

#Create engine
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(engine)

def get_db():
    db = Session() #creates a new database sessions
    try:
        yield db #passes the session to your route function
    finally:
        db.close() # closes session after the route finished