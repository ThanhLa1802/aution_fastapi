from fastapi import HTTPException, status
from ..repositories.user_repo import UserRepository
from ..schemas import UserCreate
from ..models import User
from ..auth import hash_password, verify_password, create_access_token

class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register_user(self, user_in: UserCreate):
        existing_user = await self.user_repo.get_user_by_email(user_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        new_user = User(
            email=user_in.email,
            hashed_password=hash_password(user_in.password)
        )
        return await self.user_repo.create_user(new_user)

    async def authenticate_user(self, user_in: UserCreate):
        user = await self.user_repo.get_user_by_email(user_in.email)
        if not user or not verify_password(user_in.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if user.is_enabled_2fa:
            raise HTTPException(status_code=403, detail="2FA enabled, please login via /auth/send-totp")
        token = create_access_token(data={"sub": user.email, "id": user.id})
        return {"access_token": token, "token_type": "bearer"}
    
    async def get_user_by_email(self, email: str):
        return await self.user_repo.get_user_by_email(email)