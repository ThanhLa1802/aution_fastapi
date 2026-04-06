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
            raise HTTPException(status_code=401, detail="Password or email is incorrect")
        
        # If 2FA is enabled, require TOTP verification
        if user.is_enabled_2fa:
            # Return response indicating 2FA is required
            return {
                "message": "2FA verification required",
                "requires_2fa": True,
                "email": user.email
            }
        
        # No 2FA, issue regular access token
        token = create_access_token(data={"sub": user.email, "id": user.id})
        return {"access_token": token, "token_type": "bearer", "requires_2fa": False}
    
    async def get_user_by_email(self, email: str):
        return await self.user_repo.get_user_by_email(email)