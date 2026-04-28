from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.assignment import Assignment
from pydantic import BaseModel

router = APIRouter(prefix='/assignment', tags=["Assignment"])


class AssignmentScoreUpdate(BaseModel):
    score: float
    max_score: float


@router.put("/{assignment_id}/score")
def update_assignment_score(
    assignment_id: int,
    update: AssignmentScoreUpdate,
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.assignment_id == assignment_id).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.score = update.score
    assignment.max_score = update.max_score

    db.commit()
    db.refresh(assignment)

    return {"message": "Assignment updated successfully"}