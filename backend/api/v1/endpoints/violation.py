from fastapi import APIRouter, Depends, HTTPException
from db.session import get_db
from crud.violation_crud import get_all_violation
from sqlalchemy.orm import Session  
router = APIRouter()

@router.get("/")
def get_all_violations(db: Session = Depends(get_db)):
    return get_all_violation(db)

@router.get("/violations/{violation_id}")
def get_violation(violation_id: int, db: Session = Depends(get_db)):
    return get_violation(violation_id, db)      

