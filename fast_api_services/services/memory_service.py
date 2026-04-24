"""
Conversation memory service — Redis-backed chat history.

Keys
────
  chat_history:{conversation_id}  — JSON-serialised list of messages
                                    TTL: CHAT_HISTORY_TTL seconds (default 2 h)

Message format on disk
──────────────────────
  [{"role": "human", "content": "..."}, {"role": "ai", "content": "..."}, ...]

Only "human" and "ai" roles are stored.  Unknown roles are silently skipped
on load so forward-compatibility is maintained if the schema evolves.
"""

import json
from redis.asyncio import Redis
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

CHAT_HISTORY_PREFIX = 'chat_history:'
CHAT_HISTORY_TTL = 7200   # 2 hours
MAX_HISTORY_TURNS = 5     # keep last 5 human+ai pairs (= 10 messages)


async def load_history(redis: Redis, conversation_id: str) -> list[BaseMessage]:
    """
    Load the stored conversation history for *conversation_id*.

    Returns an empty list when the key does not exist or the stored array
    is empty.  Unknown roles are silently skipped.
    """
    raw = await redis.get(f'{CHAT_HISTORY_PREFIX}{conversation_id}')
    if not raw:
        return []

    messages: list[BaseMessage] = []
    for record in json.loads(raw):
        role = record.get('role')
        content = record.get('content', '')
        if role == 'human':
            messages.append(HumanMessage(content=content))
        elif role == 'ai':
            messages.append(AIMessage(content=content))
        # other roles (system, tool, …) are intentionally ignored
    return messages


async def save_history(
    redis: Redis,
    conversation_id: str,
    history: list[BaseMessage],
    ttl: int = CHAT_HISTORY_TTL,
) -> None:
    """
    Persist *history* to Redis, overwriting any previous value.

    Only HumanMessage and AIMessage instances are serialised.
    A TTL is always set so stale conversations are cleaned up automatically.
    """
    records = []
    for msg in history:
        if isinstance(msg, HumanMessage):
            records.append({'role': 'human', 'content': msg.content})
        elif isinstance(msg, AIMessage):
            records.append({'role': 'ai', 'content': msg.content})

    # Trim to last MAX_HISTORY_TURNS turns (each turn = 1 human + 1 ai message)
    max_messages = MAX_HISTORY_TURNS * 2
    if len(records) > max_messages:
        records = records[-max_messages:]

    await redis.set(
        f'{CHAT_HISTORY_PREFIX}{conversation_id}',
        json.dumps(records),
        ex=ttl,
    )
