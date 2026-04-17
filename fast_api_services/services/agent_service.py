"""
Agent service — LangChain + OpenAI, Step 1 & 2.

Architecture
────────────
Step 1  Basic ChatOpenAI call with SSE streaming.
Step 2  Product-search tool backed by Elasticsearch (already running).

Learning notes
──────────────
- @tool on an async def = LangChain CoroutineTool; handled by AgentExecutor.astream_events().
- _get_executor() is a lazy singleton: the LLM object / prompt are stateless, so
  we build them once and reuse.  Re-building per request is wasteful.
- astream_events(version="v1") yields fine-grained events:
    on_chat_model_stream → individual LLM tokens
    on_tool_start        → agent decided to call a tool  (good for "Searching…" UI)
    on_tool_end          → tool returned a result
- We forward only the token and tool_start events to the client as SSE.
"""

import os
import json
import logging
import warnings
from typing import AsyncIterator

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core._api.beta_decorator import LangChainBetaWarning

# astream_events(version="v1") is stable enough for production use;
# suppress the beta nag so logs stay clean.
warnings.filterwarnings('ignore', category=LangChainBetaWarning)

logger = logging.getLogger(__name__)

# ─── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a helpful ecommerce assistant for our online store.

You can help customers with:
- Finding and comparing products — use the search_products tool whenever the user mentions a product.
- Product prices, availability, and descriptions.
- Store policies:
    • Return policy: 30-day returns on all items (unused, original packaging).
    • Shipping: free on orders over $50; otherwise flat $5.
    • Payment: credit card, PayPal, and mock (test) mode.

Rules:
- Always use the search_products tool before answering product questions.
- Always show the product name and price in your answer.
- If you don't know something, say so — never fabricate information.
- Be concise and friendly.
"""

# ─── Tool: product search via Elasticsearch ───────────────────────────────────

@tool
async def search_products(query: str) -> str:
    """
    Search for products by name or description.
    Use this tool whenever the user asks about a product, its price,
    availability, specifications, or wants a recommendation.
    """
    # Lazy import avoids circular references at module load time.
    from database import elasticsearch_client, PRODUCT_INDEX

    try:
        resp = await elasticsearch_client.search(
            index=PRODUCT_INDEX,
            query={
                'multi_match': {
                    'query': query,
                    'fields': ['name^2', 'description'],
                }
            },
            size=5,
        )
        hits = resp.get('hits', {}).get('hits', [])
        if not hits:
            return 'No products found matching your query.'

        lines = []
        for h in hits:
            s = h['_source']
            product_id = h['_id']  # id is stored as ES doc id, not in _source
            stock_label = 'in stock' if s.get('stock', 0) > 0 else 'out of stock'
            lines.append(
                f"• **{s['name']}** — ${s['price']} ({stock_label}, ID: {product_id})"
            )
        return '\n'.join(lines)

    except Exception as exc:
        logger.error('search_products tool error: %s', exc)
        return 'Product search is temporarily unavailable. Please try again.'


# ─── Agent executor (lazy singleton) ─────────────────────────────────────────

_executor: AgentExecutor | None = None


def _build_executor() -> AgentExecutor:
    """
    Build the LangChain AgentExecutor.
    Called once on first request; reused for all subsequent requests.
    """
    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        raise RuntimeError(
            'OPENAI_API_KEY is not set. '
            'Add it to your .env file and restart the container.'
        )

    # ── LLM ──────────────────────────────────────────────────────────────────
    # gpt-4o-mini: cheap, fast, supports function/tool calling.
    # streaming=True lets astream_events() receive tokens incrementally.
    llm = ChatOpenAI(
        model='gpt-4o-mini',
        temperature=0,       # deterministic answers for product/policy Q&A
        streaming=True,
        api_key=api_key,
    )

    # ── Prompt ───────────────────────────────────────────────────────────────
    # MessagesPlaceholder("chat_history") is optional (Step 6: memory).
    # MessagesPlaceholder("agent_scratchpad") is required by create_openai_tools_agent
    # — it's where intermediate tool calls are inserted during the reasoning loop.
    prompt = ChatPromptTemplate.from_messages([
        ('system', _SYSTEM_PROMPT),
        MessagesPlaceholder('chat_history', optional=True),
        ('human', '{input}'),
        MessagesPlaceholder('agent_scratchpad'),
    ])

    # ── Agent ─────────────────────────────────────────────────────────────────
    # create_openai_tools_agent → wires llm + tools + prompt into a runnable
    # that drives the ReAct-style tool-calling loop.
    tools = [search_products]
    agent = create_openai_tools_agent(llm, tools, prompt)

    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,       # set True locally to see the full reasoning trace
        max_iterations=5,    # safety cap: prevent infinite tool loops
    )


def get_executor() -> AgentExecutor:
    """Return the singleton AgentExecutor, building it on first call."""
    global _executor
    if _executor is None:
        _executor = _build_executor()
    return _executor


# ─── Streaming helper ─────────────────────────────────────────────────────────

async def stream_agent_response(message: str) -> AsyncIterator[str]:
    """
    Run the agent and yield Server-Sent Events (SSE) strings.

    SSE format (each line):
        data: {"type": "token",      "token": "Hello"}   ← LLM token
        data: {"type": "tool_start", "tool":  "search_products"}  ← tool called
        data: [DONE]                                      ← stream finished

    The React frontend reads these with fetch() + ReadableStream.
    """
    try:
        executor = get_executor()
    except RuntimeError as exc:
        yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
        yield 'data: [DONE]\n\n'
        return

    try:
        # astream_events() is the LangChain 0.2 streaming API.
        # version="v1" — stable event schema.
        async for event in executor.astream_events({'input': message}, version='v1'):
            kind = event.get('event')

            # ── LLM token ─────────────────────────────────────────────────
            if kind == 'on_chat_model_stream':
                chunk = event.get('data', {}).get('chunk')
                if chunk and chunk.content:
                    yield f"data: {json.dumps({'type': 'token', 'token': chunk.content})}\n\n"

            # ── Tool invoked (e.g. "Searching for products…") ─────────────
            elif kind == 'on_tool_start':
                tool_name = event.get('name', '')
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

        yield 'data: [DONE]\n\n'

    except Exception as exc:
        logger.error('Agent streaming error: %s', exc)
        yield f"data: {json.dumps({'type': 'error', 'error': 'Agent error. Please try again.'})}\n\n"
        yield 'data: [DONE]\n\n'
