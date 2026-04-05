from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models import User

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str):
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def create_user(self, user: User):
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def update_user(self, user: User):
        """Update an existing user"""
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
