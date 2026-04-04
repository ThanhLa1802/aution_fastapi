# implement pydantic schemas here
from pydantic import BaseModel, ConfigDict, EmailStr
class TaskCreate(BaseModel):
    title: str
    description: str

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    owner_id: int

    #replace with ConfigDict
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)