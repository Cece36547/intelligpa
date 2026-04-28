from pydantic import BaseModel, ConfigDict
from typing import Optional


class responseAssignmentCategory(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    category_id: int
    category_name: str
    weight: Optional[float] = None