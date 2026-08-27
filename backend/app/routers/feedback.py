from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import Feedback
from app.db.session import get_db
from app.schemas import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=201)
def submit_feedback(request: FeedbackCreate, db: Session = Depends(get_db)) -> Feedback:
    feedback = Feedback(
        question=request.question,
        answer=request.answer,
        rating=request.rating,
        document_id=request.document_id,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
