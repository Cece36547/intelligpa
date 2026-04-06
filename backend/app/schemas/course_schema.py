from pydantic import BaseModel, ConfigDict


class createCourse(BaseModel):
    course_name: str
    instructor : str

class courseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    course_name: str
    instructor : str
    course_id : int

    