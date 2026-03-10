from pydantic import BaseModel, field_validator

class UserCreateRequest(BaseModel):
    user_name: str
    password: str
    balance: float = 0

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v