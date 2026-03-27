from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Column, Integer, String,Float,Date,DateTime, func, ForeignKey

class Base(DeclarativeBase):
    pass
