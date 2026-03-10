from app.core.security import hash_password
from .repository import UserRepository
from .models import User

class UserService:

    def __init__(self):
        self.repo = UserRepository()

    def create_user(self, session, user_name: str, password: str, balance: float = 0):
        hashed = hash_password(password)

        user = User(
            user_name=user_name,
            hash_password=hashed,
            balance=balance
        )

        return self.repo.create(session, user)
    
    def get_user_by_name(self, session, user_name):
        user = self.repo.get_by_user_name(session, user_name)
        return user if user else {}