from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    """
    Request body for POST /agent/chat.

    message       — the user's question or instruction (1-2000 chars).
    conversation_id — reserved for Step 6 (conversation memory via Redis).
                      Ignored for now but accepted so clients can send it early.
    """
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None, max_length=64)
