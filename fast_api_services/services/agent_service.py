"""
Agent service — LangChain + OpenAI.

Tools
─────
• search_products  — stateless, Elasticsearch-backed. Reused via singleton executor.
• get_order_status — requires user_id at call time. Built as a closure per request
                     so it can ONLY ever access the authenticated user's own orders.

Executor strategy
─────────────────
• LLM + prompt are lazy singletons — stateless, safe to share.
• Anonymous request  → singleton executor with [search_products] only.
• Authenticated request → per-request executor with [search_products, get_order_status].
  Cost: one small AgentExecutor allocation per request (negligible).

Learning notes
──────────────
- Closure tool pattern: factory function captures user_id + db; the @tool
  decorator bakes those values in with no global mutable state and no way
  for the agent to access another user's data.
- astream_events(version="v1") events used:
    on_chat_model_stream → individual LLM tokens
    on_tool_start        → agent decided to call a tool
"""

import os
import json
import logging
import warnings
from typing import AsyncIterator, Optional
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import tool, BaseTool
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core._api.beta_decorator import LangChainBetaWarning
from services.memory_service import load_history, save_history

warnings.filterwarnings('ignore', category=LangChainBetaWarning)

logger = logging.getLogger(__name__)

# ─── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a helpful ecommerce assistant for our online store.

You can help customers with:
- Finding and comparing products — use the search_products tool whenever the user mentions a product, product category, or asks to browse/list/show products.
- Product prices, availability, and descriptions.
- Checking their own order status — use the get_order_status tool when the user asks about an order.
- Store policies:
    • Return policy: 30-day returns on all items (unused, original packaging).
    • Shipping: free on orders over $50; otherwise flat $5.
    • Payment: credit card, PayPal, and mock (test) mode.

Rules:
- Always use the search_products tool before answering product questions.
- Always use the get_order_status tool when the user asks about order status or a shipment.
- Always show the product name and price in your answer.
- If you don't know something, say so — never fabricate information.
- Be concise and friendly.
"""

# ─── Tool: product search via Elasticsearch ───────────────────────────────────

@tool
async def search_products(query: str) -> str:
    """Search for products by name, category, or description.
    Use this tool whenever the user asks about a product, a product category,
    its price, availability, specifications, or wants a recommendation.
    Examples: 'smartphones', 'laptops under $1000', 'Sony headphones',
    'show me all tablets', 'what cameras do you have?'
    """
    from database import elasticsearch_client, PRODUCT_INDEX

    try:
        resp = await elasticsearch_client.search(
            index=PRODUCT_INDEX,
            query={
                'multi_match': {
                    'query': query,
                    'fields': ['name^3', 'category_name^2', 'description'],
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
            product_id = h['_id']  # id lives in _id, not _source
            stock_label = 'in stock' if s.get('stock', 0) > 0 else 'out of stock'
            lines.append(
                f"• **{s['name']}** — ${s['price']} ({stock_label}, ID: {product_id})"
            )
        return '\n'.join(lines)

    except Exception as exc:
        logger.error('search_products tool error: %s', exc)
        return 'Product search is temporarily unavailable. Please try again.'


# ─── Tool factory: order status (per-request, user-scoped) ───────────────────

_ORDER_STATUS_LABELS = {0: 'Cancelled', 1: 'Created', 2: 'Paid', 3: 'Shipped', 4: 'Completed'}


def make_order_status_tool(user_id: int, db: AsyncSession) -> BaseTool:
    """
    Return a LangChain tool scoped to a single authenticated user.

    Security: user_id is captured by the closure at factory time.
    The SQL query always includes AND user_id = {user_id} — the agent
    cannot retrieve another user's orders even if it tries a different UUID.
    """

    @tool
    async def get_order_status(order_id: str) -> str:
        """
        Look up the status of one of the current user's orders.
        Use this when the user asks about their order, shipment, or delivery.
        The order_id is the UUID shown on the Orders page (e.g. 'a1b2c3d4-...').
        """
        from sqlmodel import select
        from models import Order, OrderItem, Product

        try:
            # Validate UUID format before touching the DB
            try:
                oid = UUID(order_id.strip())
            except (ValueError, AttributeError):
                return (
                    f"'{order_id}' is not a valid order ID. "
                    "Order IDs look like 'a1b2c3d4-e5f6-...'. "
                    "You can find yours on the Orders page."
                )

            result = await db.execute(
                select(Order).where(Order.id == oid, Order.user_id == user_id)
            )
            order = result.scalar_one_or_none()

            if not order:
                return (
                    f"No order '{order_id}' was found on your account. "
                    "Please double-check the ID from your Orders page."
                )

            # Fetch items with product names
            items_result = await db.execute(
                select(OrderItem, Product)
                .join(Product, OrderItem.product_id == Product.id)
                .where(OrderItem.order_id == oid)
            )
            rows = items_result.all()

            status_label = _ORDER_STATUS_LABELS.get(order.status, 'Unknown')
            placed = order.created_at.strftime('%Y-%m-%d') if order.created_at else 'N/A'
            lines = [
                f"Order **{str(oid)[:8]}…** — Status: **{status_label}**",
                f"Total: **${order.total_price}** | Placed: {placed}",
                "Items:",
            ]
            for item, product in rows:
                lines.append(f"  • {product.name} × {item.quantity} @ ${item.unit_price}")

            return '\n'.join(lines)

        except Exception as exc:
            logger.error('get_order_status tool error: %s', exc)
            return 'Could not retrieve order details. Please try again.'

    return get_order_status


# ─── LLM + prompt singletons (stateless — safe to share) ─────────────────────

_llm: ChatOpenAI | None = None
_prompt: ChatPromptTemplate | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        api_key = os.environ.get('OPENAI_API_KEY', '')
        if not api_key:
            raise RuntimeError(
                'OPENAI_API_KEY is not set. '
                'Add it to your .env file and restart the container.'
            )
        _llm = ChatOpenAI(model='gpt-4o-mini', temperature=0, streaming=True, api_key=api_key)
    return _llm


def _get_prompt() -> ChatPromptTemplate:
    global _prompt
    if _prompt is None:
        _prompt = ChatPromptTemplate.from_messages([
            ('system', _SYSTEM_PROMPT),
            MessagesPlaceholder('chat_history', optional=True),
            ('human', '{input}'),
            MessagesPlaceholder('agent_scratchpad'),
        ])
    return _prompt


def _build_executor(tools: list) -> AgentExecutor:
    agent = create_openai_tools_agent(_get_llm(), tools, _get_prompt())
    return AgentExecutor(agent=agent, tools=tools, verbose=False, max_iterations=5)


# Anonymous singleton (search_products only, no DB needed)
_anon_executor: AgentExecutor | None = None


def _get_anon_executor() -> AgentExecutor:
    global _anon_executor
    if _anon_executor is None:
        _anon_executor = _build_executor([search_products])
    return _anon_executor


# ─── Streaming helper ─────────────────────────────────────────────────────────

async def stream_agent_response(
    message: str,
    user_id: Optional[int] = None,
    db: Optional[AsyncSession] = None,
    conversation_id: Optional[str] = None,
    redis: Optional[Redis] = None,
) -> AsyncIterator[str]:
    """
    Run the agent and yield SSE strings.

    user_id + db            → authenticated; get_order_status tool available.
    user_id None            → anonymous; only search_products available.
    conversation_id + redis → history is loaded before the call and saved
                              after, appending the new human+ai turn.
    """
    # Load prior conversation history when memory is enabled
    chat_history = []
    if conversation_id and redis:
        chat_history = await load_history(redis, conversation_id)

    try:
        if user_id is not None and db is not None:
            order_tool = make_order_status_tool(user_id, db)
            executor = _build_executor([search_products, order_tool])
        else:
            executor = _get_anon_executor()
    except RuntimeError as exc:
        yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"
        yield 'data: [DONE]\n\n'
        return

    response_tokens: list[str] = []  # buffer full AI reply for history

    try:
        async for event in executor.astream_events(
            {'input': message, 'chat_history': chat_history}, version='v1'
        ):
            kind = event.get('event')

            if kind == 'on_chat_model_stream':
                chunk = event.get('data', {}).get('chunk')
                if chunk and chunk.content:
                    response_tokens.append(chunk.content)
                    yield f"data: {json.dumps({'type': 'token', 'token': chunk.content})}\n\n"

            elif kind == 'on_tool_start':
                tool_name = event.get('name', '')
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"

        # Persist the new turn — best-effort, never fails the request
        if conversation_id and redis and response_tokens:
            new_history = chat_history + [
                HumanMessage(content=message),
                AIMessage(content=''.join(response_tokens)),
            ]
            try:
                await save_history(redis, conversation_id, new_history)
            except Exception as mem_exc:
                logger.warning('Failed to save conversation history: %s', mem_exc)

        yield 'data: [DONE]\n\n'

    except Exception as exc:
        logger.error('Agent streaming error: %s', exc)
        yield f"data: {json.dumps({'type': 'error', 'error': 'Agent error. Please try again.'})}\n\n"
        yield 'data: [DONE]\n\n'
