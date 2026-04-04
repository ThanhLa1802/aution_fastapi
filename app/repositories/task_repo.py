from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models import Task

class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_by_user(self, user_id: int):
        result = await self.db.execute(select(Task).where(Task.owner_id == user_id))
        return result.scalars().all()

    async def get_by_id(self, task_id: int):
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        return result.scalars().first()

    async def create(self, task_data: Task) -> Task:
        self.db.add(task_data)
        await self.db.commit()
        await self.db.refresh(task_data)
        return task_data

    async def delete(self, task: Task):
        await self.db.delete(task)
        await self.db.commit()