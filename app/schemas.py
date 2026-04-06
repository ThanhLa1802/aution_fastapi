# implement pydantic schemas here
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
class TaskCreate(BaseModel):
    title: str
    description: str

class TaskUpdate(BaseModel):
    title: str
    description: str

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    owner_id: int
    is_completed: bool

    #replace with ConfigDict
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class LoginResponse(BaseModel):
    """Unified response for login endpoint - handles both regular and 2FA flows"""
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    requires_2fa: bool = False
    email: Optional[str] = None
    message: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)

class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # base64 encoded QR code
    manual_entry_key: str

class TwoFAVerifyRequest(BaseModel):
    code: str  # 6-digit TOTP code

class TwoFAEnableResponse(BaseModel):
    message: str
    is_enabled_2fa: bool

class DeleteResponse(BaseModel):
    message: str

class MarkCompletedRequest(BaseModel):
    is_completed: bool

class PreAuthResponse(BaseModel):
    """Response when 2FA is required before login"""
    message: str
    requires_2fa: bool
    email: str
    temp_token: str  # Temporary token to use for TOTP verification

class TOTPLoginRequest(BaseModel):
    """TOTP code for 2FA login verification"""
    code: str