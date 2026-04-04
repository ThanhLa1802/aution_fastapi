from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas import TokenResponse, UserCreate, UserResponse
from ..services.user_service import UserService
from ..repositories.user_repo import UserRepository
from ..dependencies import get_email_from_current_token

router = APIRouter(prefix="/users", tags=["Users"])

async def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    repo = UserRepository(db)
    return UserService(repo)

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, service: UserService = Depends(get_user_service)):
    return await service.register_user(user_in)

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserCreate, service: UserService = Depends(get_user_service)):
    return await service.authenticate_user(user_in)

@router.get("/me", response_model=UserResponse)
async def read_current_user(
    email: str = Depends(get_email_from_current_token),
    service: UserService = Depends(get_user_service)
):
    return await service.get_user_by_email(email)