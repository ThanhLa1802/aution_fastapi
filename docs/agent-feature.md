# Tính năng AI Agent — Tài liệu kỹ thuật

> **Phiên bản:** 1.1 · **Ngày cập nhật:** tháng 4 năm 2026

---

## Mục lục

1. [Tổng quan kinh doanh](#1-tổng-quan-kinh-doanh)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Luồng xử lý chi tiết](#3-luồng-xử-lý-chi-tiết)
4. [Các thành phần kỹ thuật](#4-các-thành-phần-kỹ-thuật)
5. [Bộ nhớ hội thoại](#5-bộ-nhớ-hội-thoại)
6. [Bảo mật & Xác thực](#6-bảo-mật--xác-thực)
7. [Giao thức SSE](#7-giao-thức-sse)
8. [Cấu hình môi trường](#8-cấu-hình-môi-trường)
9. [Kế hoạch mở rộng](#9-kế-hoạch-mở-rộng)

---

## 1. Tổng quan kinh doanh

### 1.1 Mục đích

Tính năng AI Agent cung cấp trợ lý ảo thông minh tích hợp trực tiếp vào giao diện cửa hàng trực tuyến. Trợ lý được xây dựng trên nền tảng **LangChain + OpenAI GPT-4o-mini**, giúp khách hàng:

| Nhu cầu khách hàng | Khả năng của agent |
|---|---|
| Tìm kiếm sản phẩm | Tìm kiếm full-text qua Elasticsearch, trả về tên, giá, tồn kho |
| So sánh sản phẩm | Gọi `search_products` nhiều lần rồi tổng hợp |
| Hỏi về chính sách | Trả lời từ prompt hệ thống (hoàn hàng, vận chuyển, thanh toán) |
| Kiểm tra đơn hàng | Truy vấn DB theo UUID đơn hàng — **chỉ dành cho người đã đăng nhập** |

### 1.2 Phân loại người dùng

```
Người dùng ẩn danh (chưa đăng nhập)
  └─ Tìm kiếm sản phẩm ✓
  └─ Hỏi chính sách ✓
  └─ Bộ nhớ hội thoại ✓   (qua conversation_id)
  └─ Kiểm tra đơn hàng ✗  (tool không được cung cấp)

Người dùng đã đăng nhập (có Bearer JWT)
  └─ Tìm kiếm sản phẩm ✓
  └─ Hỏi chính sách ✓
  └─ Bộ nhớ hội thoại ✓   (qua conversation_id)
  └─ Kiểm tra đơn hàng ✓  (chỉ đơn hàng của chính mình)
```

### 1.3 Giá trị kinh doanh

- **Giảm tải CSKH:** Khách tự tra cứu sản phẩm và đơn hàng mà không cần liên hệ nhân viên.
- **Tăng chuyển đổi:** Tư vấn sản phẩm tức thì ngay tại trang mua hàng.
- **Bảo mật dữ liệu:** Kiến trúc closure đảm bảo mỗi người dùng chỉ thấy đơn hàng của mình.
- **Trải nghiệm real-time:** Phản hồi streaming token-by-token, không cần chờ toàn bộ câu trả lời.

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + MUI 5)                                         │
│                                                                     │
│  ┌─────────────────┐   FAB click    ┌──────────────────────────┐   │
│  │  Zustand        │◄──────────────►│  ChatPopup.jsx           │   │
│  │  chatStore.js   │                │  (UI popup + bubbles)    │   │
│  │  authStore.js   │                └────────────┬─────────────┘   │
│  └─────────────────┘                             │                  │
│                                           streamChat()              │
│                                      (native fetch + SSE)           │
│                                    Authorization: Bearer <token>    │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    │ HTTPS POST
                                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy (:3000)                                        │
│  /api/v1/*  →  FastAPI (:8001)                                      │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FastAPI  fast_api_services/ (:8001)                                │
│                                                                     │
│  routers/agent.py                                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  POST /api/v1/agent/chat                                     │   │
│  │                                                              │   │
│  │  1. Kiểm tra OPENAI_API_KEY (503 nếu thiếu)                 │   │
│  │  2. HTTPBearer(auto_error=False) → decode JWT → user_id      │   │
│  │  3. Mở AsyncSession (PostgreSQL)                             │   │
  │  4. Gọi stream_agent_response(message, user_id, db,         │   │
  │         conversation_id, redis)                             │   │
│  │  5. Trả về StreamingResponse (text/event-stream)            │   │
│  └─────────────────────────┬────────────────────────────────────┘   │
│                            │                                        │
│  services/agent_service.py │                                        │
│  ┌─────────────────────────▼────────────────────────────────────┐   │
│  │  stream_agent_response()                                     │   │
│  │                                                              │   │
  │  • load_history(redis, conversation_id)                    │   │
  │  • user_id = None  → anonymous executor (singleton)         │   │
  │  • user_id ≠ None  → per-request executor                   │   │
  │       ┌─ search_products (stateless @tool)                  │   │
  │       └─ get_order_status (closure, scoped to user_id)      │   │
  │                                                              │   │
  │  executor.astream_events(version="v1")                      │   │
  │  → yield SSE chunks                                         │   │
  │  → save_history(redis, conversation_id, new_history)        │   │
  └──────┬──────────────────────────┬──────────────┬─────────────┘   │
         │                          │              │                 │
         ▼                          ▼              ▼                 │
  Elasticsearch 8.11          PostgreSQL 15     Redis               │
  (product full-text)         (orders, items)  (chat history)       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Ngăn xếp công nghệ

| Lớp | Công nghệ | Vai trò |
|---|---|---|
| Frontend UI | React 18 + Material UI 5 | Chat popup, message bubbles, FAB |
| Frontend State | Zustand (`chatStore`, `authStore`) | Quản lý tin nhắn, conversationId & token JWT |
| Frontend API | Native `fetch` + `ReadableStream` | SSE streaming (Axios không hỗ trợ stream) |
| Backend Router | FastAPI + Pydantic v2 | Nhận request, xác thực JWT, trả SSE |
| AI Framework | LangChain 0.2.x | Quản lý tool-calling, prompt, executor |
| LLM | OpenAI GPT-4o-mini | Sinh câu trả lời, quyết định gọi tool |
| Vector/Full-text | Elasticsearch 8.11 | Tìm kiếm sản phẩm |
| Database | PostgreSQL 15 + SQLModel | Truy vấn đơn hàng |
| **Conversation Memory** | **Redis + `memory_service.py`** | **Lưu lịch sử hội thoại, TTL 24h** |
| Auth | JWT HS256 | Xác thực người dùng (chia sẻ giữa Django + FastAPI) |

---

## 3. Luồng xử lý chi tiết

### 3.1 Luồng ẩn danh — Tìm kiếm sản phẩm

```
Người dùng nhập: "tai nghe Bluetooth dưới 500k"
        │
        ▼
[ChatPopup.jsx] handleSend()
  • accessToken = null (chưa đăng nhập)
  • gọi streamChat("tai nghe Bluetooth dưới 500k", { token: null })
        │
        ▼  POST /api/v1/agent/chat
           Headers: { Content-Type: application/json }
           Body:    { "message": "tai nghe Bluetooth dưới 500k" }
        │
        ▼
[routers/agent.py] agent_chat()
  • HTTPBearer → credentials = None
  • _extract_user_id(None) → user_id = None
  • Mở AsyncSession
  • Gọi stream_agent_response("...", user_id=None, db=db)
        │
        ▼
[agent_service.py] stream_agent_response()
  • user_id is None → dùng _get_anon_executor()
    (singleton, tools=[search_products])
        │
        ▼
[LangChain AgentExecutor] astream_events(version="v1")
  • GPT-4o-mini đọc message → quyết định gọi search_products
        │
  ┌─── on_tool_start ──────────────────────────────────────────┐
  │    yield: data: {"type":"tool_start","tool":"search_products"}│
  └────────────────────────────────────────────────────────────┘
        │
        ▼
[tool: search_products] query="tai nghe Bluetooth"
  • elasticsearch_client.search(multi_match, size=5)
  • Trả về: "• Sony WH-1000XM5 — $299 (in stock, ID: 42)\n..."
        │
        ▼
[GPT-4o-mini] tổng hợp kết quả → sinh câu trả lời
        │
  ┌─── on_chat_model_stream (nhiều lần) ───────────────────────┐
  │    yield: data: {"type":"token","token":"Dưới đây"}         │
  │    yield: data: {"type":"token","token":" là một số"}       │
  │    yield: data: {"type":"token","token":" tai nghe..."}     │
  └────────────────────────────────────────────────────────────┘
        │
        ▼
  yield: data: [DONE]
        │
        ▼
[ChatPopup.jsx] onToken() → appendToLast() → Zustand → re-render
  Hiệu ứng: chữ xuất hiện từng ký tự (streaming cursor)
```

### 3.2 Luồng xác thực — Kiểm tra đơn hàng

```
Người dùng đã đăng nhập nhập: "đơn hàng a1b2c3d4-... của tôi đang ở đâu?"
        │
        ▼
[ChatPopup.jsx] handleSend()
  • accessToken = "eyJhbGciOiJIUzI1NiIsInR..."  (từ authStore)
  • gọi streamChat("...", { token: accessToken })
        │
        ▼  POST /api/v1/agent/chat
           Headers: {
             Content-Type: application/json,
             Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR...
           }
        │
        ▼
[routers/agent.py] agent_chat()
  • HTTPBearer → credentials.credentials = "eyJ..."
  • _extract_user_id(credentials):
      jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
      → payload["sub"] = "17"
      → user_id = 17
  • Mở AsyncSession
  • Gọi stream_agent_response("...", user_id=17, db=db)
        │
        ▼
[agent_service.py] stream_agent_response()
  • user_id = 17 → tạo order_tool = make_order_status_tool(17, db)
  • executor = _build_executor([search_products, order_tool])
    (tạo mới per-request, không phải singleton)
        │
        ▼
[LangChain] GPT-4o-mini thấy 2 tools → quyết định gọi get_order_status
  • on_tool_start → yield tool_start event
        │
        ▼
[tool: get_order_status] order_id="a1b2c3d4-..."
  • Validate UUID format
  • SELECT * FROM orders WHERE id='a1b2c3d4-...' AND user_id=17
    ↑ user_id=17 được capture từ closure — KHÔNG thể thay đổi
  • JOIN order_items, products
  • Trả về:
      "Order a1b2c3d4… — Status: Shipped
       Total: $149.99 | Placed: 2026-04-10
       Items:
         • Sony WH-1000XM5 × 1 @ $149.99"
        │
        ▼
[GPT-4o-mini] định dạng, bổ sung thông tin hữu ích
  • Stream tokens về frontend
        │
        ▼
  yield: data: [DONE]
```

### 3.3 Luồng xử lý lỗi

```
Tình huống                    Phản hồi
─────────────────────────────────────────────────────────────────
OPENAI_API_KEY không được set → HTTP 503, JSON error message
JWT hết hạn / sai             → user_id = None (anonymous), không 401
UUID đơn hàng sai định dạng  → tool trả về hướng dẫn thân thiện
Đơn không thuộc user này     → "No order found on your account"
Elasticsearch không khả dụng → "Product search temporarily unavailable"
Lỗi stream giữa chừng        → yield error event + [DONE]
AbortController.abort()      → stream bị hủy, không có lỗi hiển thị
```

---

## 4. Các thành phần kỹ thuật

### 4.1 `fast_api_services/services/agent_service.py`

Đây là lõi của tính năng. Chứa toàn bộ logic LangChain.

#### System Prompt

```python
_SYSTEM_PROMPT = """You are a helpful ecommerce assistant...
• Tìm kiếm sản phẩm khi người dùng hỏi về sản phẩm
• Kiểm tra đơn hàng khi được hỏi
• Chính sách: hoàn hàng 30 ngày, free ship trên $50, ship flat $5
"""
```

Prompt được nhúng vào đầu mỗi cuộc hội thoại, định hướng hành vi của LLM.

#### Tool 1: `search_products` (stateless `@tool`)

```python
@tool
async def search_products(query: str) -> str:
    resp = await elasticsearch_client.search(
        index=PRODUCT_INDEX,
        query={'multi_match': {'query': query, 'fields': ['name^2', 'description']}},
        size=5,
    )
    # Đọc ID từ h['_id'] (không phải h['_source']['id'])
    ...
```

- **Stateless:** Không cần user context.
- **Singleton-safe:** Có thể dùng chung trong anon executor.
- **Elasticsearch:** Field `name` được boost (`^2`) để ưu tiên tên sản phẩm.

#### Tool 2: `make_order_status_tool(user_id, db)` (closure factory)

```python
def make_order_status_tool(user_id: int, db: AsyncSession) -> BaseTool:
    @tool
    async def get_order_status(order_id: str) -> str:
        # user_id được capture vào closure tại thời điểm tạo tool
        result = await db.execute(
            select(Order).where(Order.id == oid, Order.user_id == user_id)
        )
    return get_order_status
```

**Tại sao dùng closure?**

| Cách tiếp cận | Vấn đề |
|---|---|
| Global tool với `current_user` global | Race condition trong async, dữ liệu bị lẫn giữa requests |
| Tool nhận `user_id` làm tham số | LLM có thể truyền `user_id` tùy ý → **lỗ hổng bảo mật nghiêm trọng** |
| **Closure factory** ✓ | `user_id` được khóa tại compile-time của tool; LLM không thể thay đổi |

#### Chiến lược Executor

```
Singleton executor (anonymous)        Per-request executor (authenticated)
─────────────────────────────         ────────────────────────────────────
Tạo 1 lần khi khởi động              Tạo mới mỗi request
Tools: [search_products]              Tools: [search_products, order_tool]
Dùng chung an toàn (stateless)        Không share (order_tool có user_id riêng)
Chi phí: O(1)                         Chi phí: nhỏ (~vài ms allocation)
```

#### LLM & Prompt Singleton

```python
_llm: ChatOpenAI | None = None   # khởi tạo lazy, tốn kém, stateless
_prompt: ChatPromptTemplate | None = None

def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model='gpt-4o-mini', temperature=0, streaming=True)
    return _llm
```

`ChatOpenAI` và `ChatPromptTemplate` là **stateless** — an toàn để chia sẻ giữa tất cả requests.

#### Streaming với `astream_events`

```python
async for event in executor.astream_events({'input': message}, version='v1'):
    if event['event'] == 'on_chat_model_stream':
        yield f"data: {json.dumps({'type': 'token', 'token': chunk.content})}\n\n"
    elif event['event'] == 'on_tool_start':
        yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"
```

`astream_events(version="v1")` là API callback của LangChain, phát ra events theo chuẩn Server-Sent Events.

---

### 4.2 `fast_api_services/routers/agent.py`

#### Optional Auth

```python
_optional_bearer = HTTPBearer(auto_error=False)
# auto_error=False: thiếu token → None thay vì 401
```

Thiết kế này cho phép **cùng một endpoint** phục vụ cả người dùng ẩn danh lẫn đã xác thực — không cần 2 route riêng.

#### Quản lý DB Session

```python
async def _generate():
    async with AsyncSessionLocal() as db:
        async for chunk in stream_agent_response(body.message, user_id=user_id, db=db):
            yield chunk
```

Session PostgreSQL được mở khi bắt đầu stream và đóng tự động khi stream hoàn tất (kể cả khi lỗi). Điều này tránh connection leak.

#### SSE Response Headers

```python
return StreamingResponse(
    _generate(),
    media_type='text/event-stream',
    headers={
        'Cache-Control': 'no-cache',      # không cache SSE
        'Connection': 'keep-alive',        # giữ kết nối
        'X-Accel-Buffering': 'no',         # tắt buffer của Nginx
    },
)
```

`X-Accel-Buffering: no` là **bắt buộc** khi dùng Nginx làm reverse proxy — nếu thiếu, Nginx sẽ buffer toàn bộ response trước khi gửi về client.

---

### 4.3 `fast_api_services/schemas/agent.py`

```python
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None, max_length=64)
```

Validation ở lớp Pydantic:
- `min_length=1`: Không cho phép gửi tin nhắn rỗng.
- `max_length=2000`: Ngăn prompt injection quá dài làm tăng chi phí API.
- `conversation_id`: UUID phiên hội thoại — được frontend tạo tự động qua `crypto.randomUUID()` và gửi kèm mỗi request. Backend dùng để load/save lịch sử từ Redis.

---

### 4.4 `frontend/src/api/agent.js`

```javascript
export function streamChat(message, { onToken, onToolStart, onDone, onError, token = null }) {
    const controller = new AbortController();

    (async () => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch('/api/v1/agent/chat', {
            method: 'POST', headers,
            body: JSON.stringify({ message }),
            signal: controller.signal,
        });

        const reader = resp.body.getReader();
        // ... xử lý SSE line-by-line
    })();

    return () => controller.abort();   // caller có thể hủy stream
}
```

**Tại sao dùng `fetch` thay vì Axios?**
Axios không hỗ trợ `ReadableStream` streaming. `fetch` + `getReader()` là cách duy nhất để đọc SSE từng token.

---

### 4.5 `frontend/src/components/ChatPopup.jsx`

#### Cấu trúc UI

```
┌─────────────────────────────────┐
│  🤖 AI Assistant          [X]   │  ← Header với gradient cam
├─────────────────────────────────┤
│                                 │
│  [🤖] Xin chào! Tôi có thể...  │  ← Assistant bubble (trái)
│                                 │
│              Tai nghe giá rẻ [👤]│  ← User bubble (phải)
│                                 │
│  🔍 Searching search_products…  │  ← Tool chip (giữa)
│                                 │
│  [🤖] Dưới đây là một số tai   │  ← Streaming response
│        nghe phù hợp:▌           │     (cursor nhấp nháy)
│                                 │
├─────────────────────────────────┤
│  [Nhập câu hỏi...        ] [→]  │  ← TextField + Send button
└─────────────────────────────────┘
```

#### State flow

```
[User gõ + Enter]
    → handleSend()
    → addMessage('user', text)        ← bubble người dùng xuất hiện
    → addMessage('assistant', '')     ← placeholder rỗng để stream vào
    → setLoading(true)
    → streamChat(text, { token: accessToken, ... })
         on_tool_start → addMessage('tool', toolName)   ← chip hiển thị
         on_token      → appendToLast(token)            ← chữ stream từng ký tự
         on_done       → finishStreaming(); setLoading(false)
         on_error      → appendToLast('⚠️ ' + err)
```

#### Zustand Stores

**`chatStore.js`**

| State | Kiểu | Mô tả |
|---|---|---|
| `isOpen` | `boolean` | Popup đang mở hay đóng |
| `messages` | `{role, text, streaming}[]` | Danh sách tin nhắn |
| `isLoading` | `boolean` | Đang chờ stream |
| `conversationId` | `string` (UUID) | ID phiên hội thoại — tạo lúc khởi động, reset khi xóa chat |

**`authStore.js`** (liên quan)

| State | Lưu trữ | Mô tả |
|---|---|---|
| `accessToken` | In-memory | JWT ngắn hạn (không lưu localStorage — chống XSS) |
| `refreshToken` | localStorage | JWT dài hạn để refresh session |

---

---

## 5. Bộ nhớ hội thoại

### 5.1 Tổng quan

Step 5 thêm khả năng nhớ ngữ cảnh hội thoại qua các lần gửi tin nhắn trong cùng một phiên. Agent có thể hiểu các câu hỏi tiếp theo như "cái đó giá bao nhiêu?" hay "tôi muốn đặt hàng cái đầu tiên" mà không cần người dùng lặp lại thông tin.

### 5.2 Kiến trúc bộ nhớ

```
Frontend
  chatStore.conversationId = crypto.randomUUID()   ← tạo khi page load
  clearMessages() → reset conversationId mới       ← khi xóa chat
        │
        │  conversation_id gửi kèm mỗi request
        ▼
Backend  routers/agent.py
  body.conversation_id → stream_agent_response(..., conversation_id, redis)
        │
        ▼
  services/memory_service.py
  ┌─ load_history(redis, conversation_id)
  │    key: "chat_history:{conversation_id}"
  │    → list[HumanMessage | AIMessage]
  │
  ├─ inject vào executor:
  │    astream_events({'input': msg, 'chat_history': history})
  │
  └─ save_history(redis, conversation_id, updated_history)
       key: "chat_history:{conversation_id}"
       TTL: 86 400 giây (24 giờ)
```

### 5.3 Redis key schema

| Key | Kiểu | TTL | Nội dung |
|---|---|---|---|
| `chat_history:{uuid}` | String (JSON) | 24h | `[{"role":"human","content":"..."},{"role":"ai","content":"..."}]` |

Chỉ serialize `HumanMessage` và `AIMessage` — các message type khác (tool, system) bị bỏ qua khi lưu.

### 5.4 `services/memory_service.py`

```python
CHAT_HISTORY_TTL = 86_400  # 24 giờ

async def load_history(redis, conversation_id) -> list[BaseMessage]:
    raw = await redis.get(f'chat_history:{conversation_id}')
    if not raw:
        return []  # cuộc trò chuyện mới
    return [HumanMessage(content=r['content']) if r['role'] == 'human'
            else AIMessage(content=r['content'])
            for r in json.loads(raw) if r['role'] in ('human', 'ai')]

async def save_history(redis, conversation_id, history, ttl=CHAT_HISTORY_TTL):
    records = [{'role': 'human' if isinstance(m, HumanMessage) else 'ai',
                'content': m.content} for m in history
               if isinstance(m, (HumanMessage, AIMessage))]
    await redis.set(f'chat_history:{conversation_id}', json.dumps(records), ex=ttl)
```

### 5.5 Tích hợp với `stream_agent_response`

```python
async def stream_agent_response(
    message: str,
    user_id=None, db=None,
    conversation_id=None, redis=None,   # ← tham số mới
) -> AsyncIterator[str]:

    # 1. Load history trước khi chạy agent
    chat_history = []
    if conversation_id and redis:
        chat_history = await load_history(redis, conversation_id)

    # 2. Chạy agent với chat_history
    async for event in executor.astream_events(
        {'input': message, 'chat_history': chat_history}, version='v1'
    ):
        ...

    # 3. Lưu lại lịch sử sau khi stream xong (best-effort)
    if conversation_id and redis and response_tokens:
        new_history = chat_history + [
            HumanMessage(content=message),
            AIMessage(content=''.join(response_tokens)),
        ]
        await save_history(redis, conversation_id, new_history)
```

> **Best-effort:** Lỗi khi lưu history chỉ ghi cảnh báo vào log — không làm fail request của người dùng.

### 5.6 Test coverage

File `fast_api_services/tests/test_memory_service.py` — **11 unit tests** dùng `fakeredis`:

| Test | Kiểm tra |
|---|---|
| `test_load_history_returns_empty_list_when_no_key` | Key không tồn tại → list rỗng |
| `test_load_history_returns_empty_list_for_empty_stored_array` | JSON `[]` → list rỗng |
| `test_load_history_converts_human_message` | `role=human` → `HumanMessage` |
| `test_load_history_converts_ai_message` | `role=ai` → `AIMessage` |
| `test_load_history_preserves_order` | Thứ tự tin nhắn được giữ nguyên |
| `test_load_history_ignores_unknown_roles` | `role=system` bị bỏ qua |
| `test_save_history_persists_messages` | Ghi → đọc lại đúng nội dung |
| `test_save_history_sets_default_ttl` | TTL mặc định = 86 400s |
| `test_save_history_respects_custom_ttl` | TTL tuỳ chỉnh được áp dụng |
| `test_save_history_overwrites_previous` | Ghi lần 2 ghi đè lần 1 |
| `test_save_history_empty_list_clears_key` | Lưu list rỗng → `[]` |

## 6. Bảo mật & Xác thực

### 5.1 Mô hình bảo mật tổng thể

```
Mối đe dọa                   Biện pháp bảo vệ
────────────────────────────────────────────────────────────────
Truy cập đơn hàng người khác  Closure: user_id được khóa tại factory time,
                               SQL luôn WHERE user_id = {user_id}

Prompt injection              max_length=2000, LLM không có quyền
                               thực thi code hay gọi API ngoài

Token bị đánh cắp (XSS)      accessToken chỉ lưu in-memory,
                               không có trong localStorage/cookie

Brute-force API               Rate limiting middleware FastAPI +
                               Nginx auth zone (5 req/min per IP)

JWT giả mạo                   HS256 với SECRET_KEY chia sẻ giữa
                               Django + FastAPI, validate đầy đủ

Token hết hạn                 auto_error=False: token hết hạn →
                               user_id=None (ẩn danh), không crash
```

### 5.2 Tại sao `accessToken` không bao giờ lưu localStorage?

```
Luồng auth an toàn:
  1. Đăng nhập → Django trả accessToken + refreshToken
  2. accessToken → lưu trong Zustand memory (biến JavaScript)
  3. refreshToken → lưu localStorage (cần để restore session)
  4. Khi tab đóng: accessToken mất, refreshToken còn
  5. Khi mở lại app: dùng refreshToken → lấy accessToken mới

Nếu accessToken ở localStorage:
  - Script độc hại (XSS) có thể đọc → chiếm tài khoản
  - accessToken in-memory: XSS không thể đọc cross-origin
```

### 5.3 Isolation giữa users trong DB session

```python
# agent_service.py — make_order_status_tool
async def get_order_status(order_id: str) -> str:
    # oid là UUID do USER cung cấp (có thể là bất kỳ UUID nào)
    # user_id là INT được CAPTURE từ JWT (không thể cung cấp từ bên ngoài)
    result = await db.execute(
        select(Order)
        .where(Order.id == oid, Order.user_id == user_id)  # ← bắt buộc cả 2 điều kiện
    )
```

Ngay cả khi người dùng cố tình truyền UUID đơn hàng của người khác, điều kiện `AND user_id = {user_id}` sẽ trả về `None`.

---

## 7. Giao thức SSE

### 6.1 Định dạng sự kiện

Mỗi sự kiện là một dòng text theo chuẩn [W3C Server-Sent Events](https://www.w3.org/TR/eventsource/):

```
data: <JSON payload>\n\n
```

### 6.2 Các loại sự kiện

| Event type | Payload | Mô tả |
|---|---|---|
| `token` | `{"type":"token","token":"Hello"}` | Một fragment của câu trả lời LLM |
| `tool_start` | `{"type":"tool_start","tool":"search_products"}` | Agent bắt đầu gọi tool |
| `error` | `{"type":"error","error":"..."}` | Lỗi phía server |
| `[DONE]` | `data: [DONE]` | Kết thúc stream (không phải JSON) |

### 6.3 Ví dụ toàn bộ stream

```
data: {"type":"tool_start","tool":"search_products"}

data: {"type":"token","token":"D\u01b0\u1edbi \u0111\u00e2y l\u00e0 "}

data: {"type":"token","token":"m\u1ed9t s\u1ed1 tai nghe"}

data: {"type":"token","token":" ph\u00f9 h\u1ee3p:"}

data: {"type":"token","token":"\n\n**Sony WH..."}

data: [DONE]
```

### 6.4 Xử lý client-side

```javascript
// agent.js — đọc và parse SSE
const lines = buffer.split('\n');
for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6).trim();

    if (payload === '[DONE]') { onDone?.(); return; }

    const event = JSON.parse(payload);
    if (event.type === 'token')      onToken?.(event.token);
    if (event.type === 'tool_start') onToolStart?.(event.tool);
    if (event.type === 'error')      onError?.(event.error);
}
```

Client xử lý buffer line-by-line. Dòng chưa đầy đủ (cuối buffer) được giữ lại để ghép với chunk tiếp theo.

---

## 8. Cấu hình môi trường

### 8.1 Biến môi trường bắt buộc

| Biến | Vị trí | Mô tả |
|---|---|---|
| `OPENAI_API_KEY` | `.env` (root) | API key của OpenAI — **bắt buộc** |
| `SECRET_KEY` | `.env` (root) | Django secret key — dùng chung để verify JWT |
| `DATABASE_URL` | docker-compose | Chuỗi kết nối PostgreSQL |
| `REDIS_URL` | docker-compose | Chuỗi kết nối Redis (mặc định `redis://redis:6379`) |

### 8.2 Cấu hình docker-compose

```yaml
# deployment/docker-compose.yaml — service fastapi
fastapi:
  env_file:
    - path: ../.env
      required: false          # không crash nếu file không tồn tại
  environment:
    DB_HOST: db                # override để dùng Docker network
    # OPENAI_API_KEY được load từ .env ở trên
```

> **Lưu ý:** File `.env` KHÔNG được commit vào git. Xem `.gitignore`.

### 8.3 Kiểm tra cấu hình

```bash
# Xác nhận OPENAI_API_KEY đã được load trong container
docker exec deployment-fastapi-1 env | grep OPENAI

# Kiểm tra Redis đang chạy
docker exec deployment-redis-1 redis-cli ping

# Xem lịch sử hội thoại trong Redis
docker exec deployment-redis-1 redis-cli keys "chat_history:*"

# Kiểm tra agent endpoint
curl -X POST http://localhost:8001/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "tai nghe giá rẻ", "conversation_id": "test-conv-1"}'
```

---

## 9. Kế hoạch mở rộng

Roadmap 7 bước cho tính năng Agent:

| Bước | Tính năng | Trạng thái |
|---|---|---|
| 1 | Tích hợp LangChain + OpenAI, tool search sản phẩm | ✅ Hoàn thành |
| 2 | Chat UI popup, SSE streaming, tool chip hiển thị | ✅ Hoàn thành |
| 3 | Tool kiểm tra đơn hàng với xác thực người dùng | ✅ Hoàn thành |
| 4 | RAG tool — tìm kiếm chính sách cửa hàng từ `policies.md` (FAISS) | ⬜ Chưa làm |
| 5 | Conversation memory — lưu lịch sử hội thoại vào Redis | ✅ Hoàn thành |
| 6 | Proactive suggestions — đề xuất sản phẩm liên quan | ⬜ Chưa làm |
| 7 | Analytics dashboard — theo dõi câu hỏi phổ biến, tool usage | ⬜ Chưa làm |

### Chi tiết Step 4 — RAG Policy Tool

```
Ý tưởng:
  • Tạo file docs/policies.md với nội dung chính sách cửa hàng
  • Dùng FAISS + OpenAI Embeddings để index
  • Tool mới: search_policy(query) → tìm đoạn văn liên quan
  • Chain: câu hỏi user → embedding → FAISS search → context → LLM

Lợi ích:
  • Chính sách không nằm hardcode trong system prompt
  • Dễ cập nhật: chỉ cần sửa policies.md, re-index
  • Giảm token tiêu thụ (không cần gửi toàn bộ policy mỗi request)
```

### Chi tiết Step 5 — Conversation Memory ✅

```
Đã triển khai:
  • services/memory_service.py — load_history / save_history
  • Redis key: "chat_history:{conversation_id}", TTL 24h
  • Inject qua MessagesPlaceholder('chat_history') vào AgentExecutor
  • Frontend: chatStore.conversationId (UUID), gửi kèm mỗi request
  • 11 unit tests bằng fakeredis — tất cả pass
```

---

## Phụ lục — Cấu trúc file

```
fast_api_services/
├── routers/
│   └── agent.py              ← HTTP endpoint, optional auth, SSE response
├── services/
│   ├── agent_service.py      ← LangChain tools, executors, streaming logic
│   └── memory_service.py     ← load_history / save_history (Redis)
├── schemas/
│   └── agent.py              ← Pydantic request validation
└── tests/
    └── test_memory_service.py  ← 11 unit tests (fakeredis)

frontend/src/
├── api/
│   └── agent.js              ← fetch + ReadableStream SSE client (+ conversationId)
├── components/
│   └── ChatPopup.jsx         ← Chat UI (FAB + popup + bubbles)
└── store/
    ├── chatStore.js          ← Zustand: messages, isOpen, isLoading, conversationId
    └── authStore.js          ← Zustand: accessToken (memory), refreshToken (localStorage)
```
