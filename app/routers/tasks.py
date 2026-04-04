from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import get_current_user # Dependency lấy User từ Token
from ..services.task_service import TaskService
from ..repositories.task_repo import TaskRepository
from ..schemas import TaskCreate, TaskResponse
from typing import List

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Helper để khởi tạo Service
async def get_task_service(db: AsyncSession = Depends(get_db)):
    return TaskService(TaskRepository(db))

@router.post("/", response_model=TaskResponse)
async def create_task(
    task_in: TaskCreate, 
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    return await service.create_new_task(task_in, current_user.get("id"))

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    return await service.get_user_tasks(current_user.get("id"))