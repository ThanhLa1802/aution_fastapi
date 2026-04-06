from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..dependencies import get_current_user # Dependency lấy User từ Token
from ..services.task_service import TaskService
from ..repositories.task_repo import TaskRepository
from ..schemas import TaskCreate, TaskResponse, DeleteResponse, TaskUpdate, MarkCompletedRequest
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
    return await service.create_new_task(task_in, current_user.id)

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    return await service.get_user_tasks(current_user.id)

# delete task
@router.delete("/{task_id}", response_model=DeleteResponse)
async def delete_task(
    task_id: int, 
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    return await service.delete_user_task(task_id, current_user.id)

# update task
@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    return await service.update_user_task(task_id, task_in, current_user.id)

# mark task as completed
@router.patch("/{task_id}/complete", response_model=TaskResponse)
async def mark_task_completed(
    task_id: int,
    request: MarkCompletedRequest,
    service: TaskService = Depends(get_task_service),
    current_user = Depends(get_current_user)
):
    # Get task and verify ownership
    task = await service.task_repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to update this task")
    
    # Update the is_completed field
    task.is_completed = request.is_completed
    return await service.task_repo.update(task)