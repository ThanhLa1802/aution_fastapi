from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from .service import UserService
from .schemas import UserCreateRequest

router = APIRouter()
service = UserService()

@router.post("/")
def create_user(user: UserCreateRequest, session: Session = Depends(get_session)):
    user_name = user.user_name
    existed_user = service.get_user_by_name(session, user_name)
    if existed_user:
        raise HTTPException(status_code=400, detail="User đã tồn tại!")
    return service.create_user(session, user_name=user.user_name, password=user.password, balance=user.balance)