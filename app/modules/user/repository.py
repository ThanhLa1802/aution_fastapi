from sqlmodel import Session, select
from .models import User

class UserRepository:

    def create(self, session: Session, user: User):
        session.add(user)
        session.commit()
        session.refresh(user)
        return {}

    def get_by_user_name(self, session: Session, user_name: str):
        statement = select(User).where(User.user_name == user_name)
        return session.exec(statement).first()
    
    def get_user_by_id(self, session: Session, id: int):
        statement = select(User).where(User.id == id)
        return session.exec(statement).first()