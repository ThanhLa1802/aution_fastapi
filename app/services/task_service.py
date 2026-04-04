from fastapi import HTTPException, status
from ..repositories.task_repo import TaskRepository
from ..models import Task
from ..schemas import TaskCreate

class TaskService:
    def __init__(self, task_repo: TaskRepository):
        self.task_repo = task_repo

    async def create_new_task(self, task_in: TaskCreate, user_id: int):
        new_task = Task(**task_in.model_dump(), owner_id=user_id)
        return await self.task_repo.create(new_task)

    async def get_user_tasks(self, user_id: int):
        return await self.task_repo.get_all_by_user(user_id)

    async def delete_user_task(self, task_id: int, user_id: int):
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if task.owner_id != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this task")
            
        await self.task_repo.delete(task)
        return {"message": "Delete successfully"}