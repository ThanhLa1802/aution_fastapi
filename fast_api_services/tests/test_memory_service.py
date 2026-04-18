"""
Unit tests for memory_service — conversation history via Redis.

Uses fakeredis so no real Redis instance is required.

RED phase: these tests will fail until memory_service.py is implemented.
"""
import json
import pytest
import pytest_asyncio
import fakeredis.aioredis

from services.memory_service import load_history, save_history, CHAT_HISTORY_TTL, MAX_HISTORY_TURNS

from langchain_core.messages import HumanMessage, AIMessage


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def fake_redis():
    """Return a FakeRedis instance with decode_responses=True (matches production)."""
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


# ─── load_history ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_load_history_returns_empty_list_when_no_key(fake_redis):
    """Missing key → empty list, no exception."""
    result = await load_history(fake_redis, 'nonexistent-conv-id')
    assert result == []


@pytest.mark.asyncio
async def test_load_history_returns_empty_list_for_empty_stored_array(fake_redis):
    """Stored empty JSON array → empty list."""
    await fake_redis.set('chat_history:conv-1', json.dumps([]))
    result = await load_history(fake_redis, 'conv-1')
    assert result == []


@pytest.mark.asyncio
async def test_load_history_converts_human_message(fake_redis):
    """Stored human record → HumanMessage with correct content."""
    data = json.dumps([{'role': 'human', 'content': 'hello'}])
    await fake_redis.set('chat_history:conv-2', data)

    result = await load_history(fake_redis, 'conv-2')

    assert len(result) == 1
    assert isinstance(result[0], HumanMessage)
    assert result[0].content == 'hello'


@pytest.mark.asyncio
async def test_load_history_converts_ai_message(fake_redis):
    """Stored ai record → AIMessage with correct content."""
    data = json.dumps([{'role': 'ai', 'content': 'Hi there!'}])
    await fake_redis.set('chat_history:conv-3', data)

    result = await load_history(fake_redis, 'conv-3')

    assert len(result) == 1
    assert isinstance(result[0], AIMessage)
    assert result[0].content == 'Hi there!'


@pytest.mark.asyncio
async def test_load_history_preserves_order(fake_redis):
    """Messages are returned in the order they were stored."""
    data = json.dumps([
        {'role': 'human', 'content': 'first'},
        {'role': 'ai',    'content': 'second'},
        {'role': 'human', 'content': 'third'},
    ])
    await fake_redis.set('chat_history:conv-4', data)

    result = await load_history(fake_redis, 'conv-4')

    assert len(result) == 3
    assert isinstance(result[0], HumanMessage)
    assert isinstance(result[1], AIMessage)
    assert isinstance(result[2], HumanMessage)
    assert [m.content for m in result] == ['first', 'second', 'third']


@pytest.mark.asyncio
async def test_load_history_ignores_unknown_roles(fake_redis):
    """Records with unrecognised roles are silently skipped."""
    data = json.dumps([
        {'role': 'system', 'content': 'ignored'},
        {'role': 'human',  'content': 'kept'},
    ])
    await fake_redis.set('chat_history:conv-5', data)

    result = await load_history(fake_redis, 'conv-5')

    assert len(result) == 1
    assert isinstance(result[0], HumanMessage)


# ─── save_history ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_save_history_persists_messages(fake_redis):
    """save_history writes messages that load_history can read back."""
    history = [HumanMessage(content='ping'), AIMessage(content='pong')]

    await save_history(fake_redis, 'conv-6', history)
    result = await load_history(fake_redis, 'conv-6')

    assert len(result) == 2
    assert isinstance(result[0], HumanMessage)
    assert result[0].content == 'ping'
    assert isinstance(result[1], AIMessage)
    assert result[1].content == 'pong'


@pytest.mark.asyncio
async def test_save_history_sets_default_ttl(fake_redis):
    """save_history sets a TTL on the key."""
    await save_history(fake_redis, 'conv-7', [HumanMessage(content='hi')])
    ttl = await fake_redis.ttl('chat_history:conv-7')
    # TTL should be close to CHAT_HISTORY_TTL (allow ±5 s for execution time)
    assert CHAT_HISTORY_TTL - 5 <= ttl <= CHAT_HISTORY_TTL


@pytest.mark.asyncio
async def test_save_history_respects_custom_ttl(fake_redis):
    """save_history honours a caller-supplied TTL."""
    await save_history(fake_redis, 'conv-8', [HumanMessage(content='hi')], ttl=300)
    ttl = await fake_redis.ttl('chat_history:conv-8')
    assert 295 <= ttl <= 300


@pytest.mark.asyncio
async def test_save_history_overwrites_previous(fake_redis):
    """A second save replaces the first — no duplication."""
    await save_history(fake_redis, 'conv-9', [HumanMessage(content='old')])
    await save_history(fake_redis, 'conv-9', [HumanMessage(content='new')])

    result = await load_history(fake_redis, 'conv-9')
    assert len(result) == 1
    assert result[0].content == 'new'


@pytest.mark.asyncio
async def test_save_history_empty_list_clears_key(fake_redis):
    """Saving an empty history stores an empty JSON array."""
    await save_history(fake_redis, 'conv-10', [])
    result = await load_history(fake_redis, 'conv-10')
    assert result == []


@pytest.mark.asyncio
async def test_save_history_trims_to_max_turns(fake_redis):
    """History longer than MAX_HISTORY_TURNS turns is trimmed to the most recent ones."""
    # Build MAX_HISTORY_TURNS + 1 turns (each turn = HumanMessage + AIMessage)
    long_history = []
    for i in range(MAX_HISTORY_TURNS + 1):
        long_history.append(HumanMessage(content=f'question {i}'))
        long_history.append(AIMessage(content=f'answer {i}'))

    await save_history(fake_redis, 'conv-11', long_history)
    result = await load_history(fake_redis, 'conv-11')

    # Should keep only last MAX_HISTORY_TURNS turns = MAX_HISTORY_TURNS * 2 messages
    assert len(result) == MAX_HISTORY_TURNS * 2
    # First message kept should be from turn index 1 (turn 0 was dropped)
    assert result[0].content == 'question 1'
    assert result[-1].content == f'answer {MAX_HISTORY_TURNS}'
