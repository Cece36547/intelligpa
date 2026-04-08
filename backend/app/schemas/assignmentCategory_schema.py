from pydantic import BaseModel, ConfigDict

class createAssignmentCategory(BaseModel):
    catergory_id: int
    category_name: str
    weight: float

class responseAssignmentCategory(BaseModel):
    model_config = ConfigDict(from_attributes=True) #Allows Pydantic read directly from SQLAlchemy obj
    category_name: str
    weight: float

