"""
Agent router — POST /api/v1/agent/chat

Returns a Server-Sent Events (SSE) stream.

Auth: optional Bearer token.
  • Token present + valid  → authenticated; get_order_status tool is available.
  • Token absent or invalid → anonymous; only search_products is available.

SSE event types:
    {"type": "token",      "token": "Hello"}           — LLM output token
    {"type": "tool_start", "tool":  "search_products"}  — agent called a tool
    {"type": "error",      "error": "..."}              — something went wrong
    data: [DONE]                                        — stream finished
"""

import os
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from dotenv import load_dotenv

from database import AsyncSessionLocal
from dependencies import get_redis
from schemas.agent import ChatRequest
from services.agent_service import stream_agent_response

load_dotenv()

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-CHANGEME')
ALGORITHM = 'HS256'

# auto_error=False → missing/invalid token returns None instead of 401
_optional_bearer = HTTPBearer(auto_error=False)

router = APIRouter(tags=['agent'])


def _extract_user_id(credentials: HTTPAuthorizationCredentials | None) -> int | None:
    """Decode the Bearer JWT and return integer user_id, or None if absent/invalid."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get('sub')
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


@router.post('/agent/chat')
async def agent_chat(
    body: ChatRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(_optional_bearer),
    redis=Depends(get_redis),
):
    """
    Stream an AI assistant response as Server-Sent Events.

    Send a Bearer token to unlock order status queries:
        Authorization: Bearer <accessToken>

    Without a token the assistant can still answer product and policy questions.
    """
    if not os.environ.get('OPENAI_API_KEY'):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail=(
                'AI assistant is not configured. '
                'Set OPENAI_API_KEY in your environment and restart the service.'
            ),
        )

    user_id = _extract_user_id(credentials)

    # Open a DB session for the request lifetime (needed by get_order_status tool).
    # The session is passed into the generator and closed when streaming finishes.
    async def _generate():
        async with AsyncSessionLocal() as db:
            async for chunk in stream_agent_response(
                body.message,
                user_id=user_id,
                db=db,
                conversation_id=body.conversation_id,
                redis=redis,
            ):
                yield chunk

    return StreamingResponse(
        _generate(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    )
