
"""
Agent router — POST /api/v1/agent/chat

Returns a Server-Sent Events (SSE) stream so the React frontend
can display tokens as they arrive from the OpenAI model.

Auth: not required in Steps 1 & 2 (public product Q&A).
      Will be added in Step 4 when order-related tools are introduced.

SSE event types (client should handle all three):
    {"type": "token",      "token": "Hello"}         — LLM output token
    {"type": "tool_start", "tool":  "search_products"} — agent is calling a tool
    {"type": "error",      "error": "..."}            — something went wrong
    [DONE]                                            — stream finished
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from schemas.agent import ChatRequest
from services.agent_service import stream_agent_response

router = APIRouter(tags=['agent'])


@router.post('/agent/chat')
async def agent_chat(body: ChatRequest):
    """
    Stream an AI assistant response as Server-Sent Events.

    ### How streaming works
    1. Client sends: `POST /api/v1/agent/chat` with `{"message": "..."}`
    2. Server returns `Content-Type: text/event-stream`
    3. Client reads line-by-line until it sees `data: [DONE]`

    ### Example client (JavaScript)
    ```js
    const resp = await fetch('/api/v1/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Show me laptops under $1000' }),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split('\\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        const event = JSON.parse(payload);
        if (event.type === 'token') process.stdout.write(event.token);
      }
    }
    ```
    """
    if not os.environ.get('OPENAI_API_KEY'):
        raise HTTPException(
            status_code=503,
            detail=(
                'AI assistant is not configured. '
                'Set OPENAI_API_KEY in your environment and restart the service.'
            ),
        )

    return StreamingResponse(
        stream_agent_response(body.message),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            # Disable Nginx proxy buffering so tokens reach the browser immediately.
            'X-Accel-Buffering': 'no',
        },
    )
