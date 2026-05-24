# ShopNow — Frontend (React 18 + TypeScript + Vite)

Frontend cho hệ thống e-commerce học ReactJS thực chiến.  
Backend: Django (port 8000) + FastAPI (port 8001).

---

## Khởi động

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build production
npx tsc --noEmit   # kiểm tra TypeScript
```

Backend cần chạy trước (trong `deployment/`):
```bash
docker compose up -d db redis elasticsearch django fastapi
```

---

## Phase 1 — React Foundation + Layout (✅ Hoàn thành)

### Mục tiêu
Xây dựng bộ khung giao diện tĩnh: theme, layout, routing, và trang chủ.

### Những gì đã làm

#### 1. Cài đặt & cấu hình dự án
- Scaffold bằng **Vite** với template `react-ts`
- Cài thêm: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-router-dom`, `axios`, `zustand`, `@fontsource/roboto`

#### 2. Cấu trúc thư mục
```
src/
  api/            ← axios instance + các hàm gọi API
  components/
    layout/       ← Header, Footer, Layout
    product/      ← ProductCard (tái sử dụng)
  pages/          ← mỗi route là 1 file
  stores/         ← Zustand global state (Phase 4)
  theme/          ← MUI custom theme
  types/          ← TypeScript interfaces dùng chung
```

#### 3. MUI Theme (`src/theme/index.ts`)
- Tạo custom theme bằng `createTheme()`: màu primary/secondary, font Roboto, button border-radius
- Inject vào toàn app qua `ThemeProvider` + `CssBaseline` trong `main.tsx`
- **Concept:** override MUI default styles 1 chỗ, áp dụng toàn bộ app

#### 4. TypeScript Types (`src/types/index.ts`)
- Định nghĩa interfaces: `User`, `Category`, `Product`, `PaginatedResponse<T>`
- **Concept:** type-safe data flow — component nhận đúng kiểu, bắt lỗi tại compile time

#### 5. Layout Components
- **`Header.tsx`** — MUI `AppBar` + `Toolbar`: logo, nav links, cart badge, nút đăng nhập  
  *Concept: `component={RouterLink}` — MUI Button tích hợp React Router, không reload trang*
- **`Footer.tsx`** — 3-column layout dùng MUI `Grid`, links dùng `RouterLink`  
  *Concept: `sx={{ mt: 'auto' }}` đẩy footer xuống đáy trang (flexbox)*
- **`Layout.tsx`** — bọc `Header` + `<Outlet />` + `Footer`  
  *Concept: **Outlet pattern** — Header/Footer render 1 lần, chỉ nội dung trang thay đổi*

#### 6. React Router v6 (`App.tsx`)
```tsx
<BrowserRouter>
  <Routes>
    <Route element={<Layout />}>        // ← route cha = Layout
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      ...
    </Route>
    <Route path="*" element={<NotFoundPage />} />  // 404
  </Routes>
</BrowserRouter>
```
*Concept: nested routes — `<Layout>` là route cha, các trang là route con*

#### 7. HomePage (`src/pages/HomePage.tsx`)
- Hero section với gradient background
- 3 `FeatureCard` components nhận props
- **Concept:** presentational component — chỉ nhận props, không có state, không gọi API

### React Concepts đã học

| Concept | File | Mô tả |
|---------|------|-------|
| JSX | Tất cả | HTML viết trong TypeScript, `{}` nhúng expression |
| Functional Component | Tất cả | Function trả về JSX |
| Props + TS Interface | `ProductCard`, `FeatureCard` | Type-safe data truyền từ cha → con |
| MUI `sx` prop | Tất cả | Inline styles dùng theme tokens thay hardcode CSS |
| Outlet pattern | `Layout.tsx` | Shared layout không re-render khi chuyển trang |
| RouterLink | `Header`, `Footer` | Điều hướng SPA không reload |

---

## Phase 2 — Data Fetching + Routing (✅ Hoàn thành)

### Mục tiêu
Kết nối thực tế với FastAPI, hiển thị dữ liệu từ database.

### Những gì đã làm

#### 1. Axios Instance (`src/api/axios.ts`)
- `baseURL: http://localhost:8001/api/v1` (FastAPI prefix)
- Response interceptor: chuẩn hóa lỗi từ `{ detail: "..." }` của FastAPI
- **Concept:** instance pattern — cấu hình 1 lần, dùng mọi nơi

#### 2. API Functions (`src/api/products.ts`)
- `fetchProducts(params)` — `GET /products` với filter + pagination
- `fetchProduct(id)` — `GET /products/{id}`
- `fetchCategories()`, `fetchAutocomplete(q)`
- **Concept:** tách HTTP logic ra khỏi component

#### 3. ProductCard (`src/components/product/ProductCard.tsx`)
- Hiển thị ảnh, tên, giá (format VNĐ bằng `Intl.NumberFormat`), stock status
- `CardActionArea` navigate đến `/products/:id`
- **Concept:** reusable component — dùng lại ở Products, Wishlist, v.v.

#### 4. ProductsPage (`src/pages/ProductsPage.tsx`)
- `useState`: `products`, `loading`, `error`, `page`, `search`
- `useEffect` với deps `[page, search]`: gọi API khi mount + khi filter thay đổi
- Cleanup flag `cancelled`: tránh race condition khi unmount
- Loading: `<Skeleton>` 12 ô thay màn hình trắng
- Pagination: `offset = (page - 1) * LIMIT` gửi lên API
- **Concept:** controlled data fetching lifecycle

#### 5. ProductDetailPage (`src/pages/ProductDetailPage.tsx`)
- `useParams<{ id: string }>()` đọc `:id` từ URL
- Loading skeleton, error alert, breadcrumbs
- Nút "Thêm vào giỏ" (Phase 4) + "Yêu thích" (Phase 5) — disabled chờ implement
- **Concept:** `useParams` — URL là source of truth cho dữ liệu cần load

### React Concepts đã học

| Concept | File | Mô tả |
|---------|------|-------|
| `useState<T>` | `ProductsPage` | Typed state, re-render khi setter gọi |
| `useEffect(fn, deps)` | `ProductsPage`, `ProductDetailPage` | Side effect sau render |
| Cleanup function | `ProductsPage` | `return () => { cancelled = true }` |
| `useParams` | `ProductDetailPage` | Đọc URL params |
| Skeleton loading | Cả hai trang | UX tốt hơn blank screen |
| Error boundary pattern | Cả hai trang | `error && <Alert>` |

### Bug đã gặp & fix
- **404 `/products`** → sai `baseURL`, thiếu prefix `/api/v1`
- **500 FastAPI** → database `ecommerce` chưa tồn tại trong PostgreSQL
- **Django crash** → Docker image cũ chưa cài `python-dotenv`, cần `docker compose build`

---

## Phase 3 — Authentication: JWT, Zustand, ProtectedRoute (✅ Hoàn thành)

### Mục tiêu
Xây dựng luồng đăng nhập/đăng ký hoàn chỉnh, bảo vệ các trang yêu cầu xác thực,
và giữ phiên đăng nhập sống sót sau khi F5 (page refresh).

### Những gì đã làm

#### 1. Django Auth API (`src/api/auth.ts`)
- Tạo `djangoClient` riêng với `baseURL: '/django'` (Vite proxy → `localhost:8000`)
- 4 hàm: `login()`, `registerUser()`, `refreshAccessToken()`, `fetchMe()`
- **Concept:** tách axios instance — FastAPI dùng `apiClient`, Django dùng `djangoClient`

#### 2. Zustand Auth Store (`src/stores/authStore.ts`)
- Global state: `user`, `accessToken`, `isInitialized`
- Actions: `setAuth()`, `clearAuth()`, `setInitialized()`
- **Concept:** Zustand store là singleton — `useAuthStore.getState()` đọc được ngoài React component

#### 3. Cập nhật Axios Interceptors (`src/api/axios.ts`)
- **Request interceptor** — tự động gắn `Authorization: Bearer <token>` vào mỗi request
- **Response interceptor** — khi nhận 401: tự động gọi `/token/refresh/`, retry request gốc
- `isRefreshing` + `failedQueue` — xử lý nhiều request 401 cùng lúc mà không gọi refresh nhiều lần
- **Concept:** interceptor pattern — centralize auth logic, không viết lại trong từng component

#### 4. LoginPage (`src/pages/LoginPage.tsx`)
- Controlled form với `useState` per field
- Submit flow: `login()` → lưu `refreshToken` vào `localStorage` → `fetchMe()` → `setAuth()` → `navigate('/')`
- **Concept:** controlled form — React kiểm soát hoàn toàn input, dễ validate

#### 5. RegisterPage (`src/pages/RegisterPage.tsx`)
- Single form state object + `[e.target.name]` dynamic key
- Client-side validate: kiểm tra password match trước khi gọi API
- **Concept:** computed property name `{[name]: value}` để update object state gọn hơn

#### 6. ProtectedRoute (`src/components/auth/ProtectedRoute.tsx`)
- Đọc `isInitialized` — hiện spinner nếu session restore đang chạy
- Đọc `accessToken` — redirect `/login` nếu null, render `<Outlet />` nếu có token
- **Concept:** `<Outlet />` trong ProtectedRoute = nội dung trang protected, giữ Layout

#### 7. Session Restore (`AppInit` trong `App.tsx`)
- `useEffect` chạy 1 lần khi app khởi động
- Lấy `refreshToken` từ `localStorage` → gọi `refreshAccessToken()` → `fetchMe()` → `setAuth()`
- Dù thành công hay thất bại đều gọi `setInitialized()` để unblock `ProtectedRoute`
- **Concept:** "silent refresh on boot" — UX liền mạch, người dùng không bị đăng xuất sau F5

#### 8. Header cập nhật (`src/components/layout/Header.tsx`)
- Đọc `user` từ `useAuthStore` — hiện Avatar + Menu khi đã login, nút "Đăng nhập" khi chưa
- `anchorEl` state — vị trí neo MUI `<Menu>` vào button
- `handleLogout` — `clearAuth()` (xóa Zustand + localStorage) + `navigate('/login')`
- **Concept:** conditional rendering dựa vào global state, không cần prop drilling

#### 9. Vite Proxy (`vite.config.ts`)
- `/django/*` → proxy đến `http://localhost:8000` (xóa prefix `/django`)
- `/api/v1/*` → proxy đến `http://localhost:8001`
- **Lý do:** tránh CORS trong dev mà không cần cài `django-cors-headers`
- **Concept:** same-origin request trong dev server — browser thấy `localhost:5173`, không có CORS

---

### Lưu trữ JWT Token an toàn

#### Tại sao không lưu `accessToken` vào `localStorage`?

`localStorage` dễ bị tấn công **XSS (Cross-Site Scripting)**:
- Bất kỳ JavaScript nào chạy trên trang đều đọc được `localStorage`
- Nếu site bị inject script độc (qua form, URL param, third-party lib), attacker đọc được token

#### Chiến lược trong dự án này: Memory + localStorage (hybrid)

```
┌─────────────────────────────────────────────────────────┐
│                TOKEN STORAGE STRATEGY                   │
├──────────────────┬──────────────────────────────────────┤
│ accessToken      │ Zustand (JavaScript memory)          │
│                  │ ✅ XSS-safe: JS độc không truy cập  │
│                  │ ❌ Mất sau F5 → cần restore logic   │
├──────────────────┼──────────────────────────────────────┤
│ refreshToken     │ localStorage                         │
│                  │ ⚠️  Ít an toàn hơn, nhưng chấp nhận │
│                  │    được vì có thể revoke phía server │
│                  │ ✅ Tồn tại sau F5                    │
└──────────────────┴──────────────────────────────────────┘
```

#### Phương án tối ưu hơn (production): HttpOnly Cookie

```
Set-Cookie: refresh=<token>; HttpOnly; Secure; SameSite=Strict
```

| Thuộc tính | Ý nghĩa |
|-----------|---------|
| `HttpOnly` | JavaScript **không đọc được** — chỉ browser tự gửi lên server |
| `Secure` | Chỉ gửi qua HTTPS |
| `SameSite=Strict` | Chống CSRF — chỉ gửi khi request từ đúng domain |

→ Với HttpOnly Cookie, XSS không lấy được refreshToken, CSRF bị chặn bằng `SameSite`.  
→ Dự án này dùng `localStorage` vì Django SimpleJWT mặc định trả token trong response body.

#### So sánh các cách lưu token

| Cách lưu | XSS | CSRF | Tồn tại sau F5 | Dễ implement | Nên dùng khi |
|---------|-----|------|----------------|--------------|--------------|
| `localStorage` | ❌ dễ bị | ✅ an toàn | ✅ | ✅ | Học / demo |
| Memory (Zustand) | ✅ an toàn | ✅ an toàn | ❌ | ✅ | accessToken |
| `sessionStorage` | ❌ dễ bị | ✅ an toàn | ❌ | ✅ | Tab session ngắn |
| HttpOnly Cookie | ✅ an toàn | ⚠️ cần SameSite | ✅ | ❌ cần server config | Production |

#### Luồng token đầy đủ

```
Login
  │
  ├─ POST /api/auth/login/ → { access, refresh }
  ├─ localStorage.setItem('refreshToken', refresh)   ← tồn tại sau F5
  └─ Zustand: setAuth(user, access)                  ← memory only

F5 / Khởi động app
  │
  ├─ AppInit useEffect chạy
  ├─ localStorage.getItem('refreshToken')
  ├─ POST /api/auth/token/refresh/ → { access: newAccess }
  ├─ GET /api/auth/me/ → user info
  └─ Zustand: setAuth(user, newAccess) + setInitialized()

Request API (FastAPI)
  │
  ├─ axios request interceptor: thêm Authorization: Bearer <accessToken>
  ├─ Nếu 401 → tự động refresh → retry request gốc
  └─ Nếu refresh fail → clearAuth() + redirect /login

Logout
  │
  ├─ Zustand: clearAuth()                            ← xóa user + accessToken
  └─ localStorage.removeItem('refreshToken')         ← xóa refresh
```

---

### React & JS Concepts đã học

| Concept | File | Mô tả |
|---------|------|-------|
| Zustand store | `authStore.ts` | Global state không cần Context/Provider |
| `getState()` ngoài component | `axios.ts` | Đọc Zustand store trong callback, interceptor |
| Axios interceptors | `axios.ts` | Request/Response middleware — inject token, handle 401 |
| Token refresh queue | `axios.ts` | `isRefreshing` + `failedQueue` — tránh gọi refresh N lần |
| Controlled form | `LoginPage`, `RegisterPage` | `value={state}` + `onChange={setState}` |
| Dynamic key update | `RegisterPage` | `{ ...form, [e.target.name]: e.target.value }` |
| `<Outlet />` in guard | `ProtectedRoute` | Kết hợp auth check + layout trong 1 route |
| Session restore | `AppInit` | `useEffect` chạy 1 lần, restore token từ localStorage |
| Conditional rendering | `Header` | `{user ? <Avatar /> : <Button>Đăng nhập</Button>}` |
| `navigate()` | `LoginPage`, `Header` | Programmatic navigation sau action |

### Bug đã gặp & fix

- **CORS error `/api/auth/...`** → Django thiếu `django-cors-headers`; fix: thêm Vite proxy `/django → localhost:8000`
- **`require()` không chạy trong Vite** → ESM không có `require()`; fix: dùng static `import`
- **Header vẫn hiện "Đăng nhập" sau F5** → trạng thái tạm thời ~300ms, sau khi async restore xong tự cập nhật

---

## Phase 4 — Global State: Zustand CartStore + CartPage (✅ Hoàn thành)

### Mục tiêu
Quản lý giỏ hàng với Zustand global store, CRUD đầy đủ, optimistic update, và feedback UI.

### Những gì đã làm

**Kiểu dữ liệu mới** (`types/index.ts`):
```typescript
export interface CartItem {
    id: number; product_id: number; product_name: string;
    product_price: number; quantity: number; subtotal: number;
}
export interface Cart { id: number; items: CartItem[]; total: number; }
```

**API layer** (`api/cart.ts`):
- `fetchCart()` → `GET /api/v1/cart`
- `addToCart(product_id, quantity)` → `POST /api/v1/cart/add`
- `updateCartItem(item_id, quantity)` → `PATCH /api/v1/cart/item/{id}`
- `removeCartItem(item_id)` → `DELETE /api/v1/cart/item/{id}` (204)
- `clearCartApi()` → `DELETE /api/v1/cart` (204)

**Zustand CartStore** (`stores/cartStore.ts`):
```typescript
export const selectTotalItems = (s: CartState) =>
    s.cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
```
- `fetchCart`: load giỏ từ API khi mount
- `addItem`: POST → update store từ response
- `updateItem`: PATCH → update store; nếu qty ≤ 0 → gọi removeItem tự động
- `removeItem`: DELETE → optimistic update (filter local state, không re-fetch)
- `clearItems`: DELETE → optimistic update (set items: [], total: 0)
- `resetCart`: set cart = null khi logout

**CartPage** (`pages/CartPage.tsx`):
- `CartItemRow` component riêng với `busy` state — disable buttons khi đang gọi API
- Skeleton loading khi lần đầu fetch
- Empty state với icon + link "Khám phá sản phẩm"
- Confirm dialog `window.confirm()` trước khi xóa toàn bộ
- Total + badge badge cập nhật realtime qua Zustand
- "Đặt hàng" disabled (Phase 6)

**ProductDetailPage** (cập nhật):
- Quantity stepper (−/+) với min = 1, max = stock
- "Thêm vào giỏ" → kiểm tra auth trước, gọi `addItem`, hiện Snackbar feedback
- Snackbar severity success/error

**Header** (cập nhật):
- `cartCount = useCartStore(selectTotalItems)` → badge số lượng item
- `handleLogout` gọi `resetCart()` để xóa cart khỏi memory

### Concepts học được

| Concept | File | Ghi chú |
|---------|------|---------|
| Zustand action async | `cartStore.ts` | Action có thể là async function, gọi API rồi `set()` |
| Selector pattern | `cartStore.ts` | `selectTotalItems` — tái dùng, tối ưu re-render |
| Optimistic update | `cartStore.ts` | Cập nhật UI trước, rollback nếu lỗi |
| busy state | `CartPage.tsx` | Disable button khi API đang chạy, tránh double-submit |
| Cross-store call | `Header.tsx` | `useCartStore.getState().resetCart()` — gọi action không qua hook |
| Snackbar feedback | `ProductDetailPage.tsx` | Auto-close sau 3s, severity success/error |
| React Fragment `<>` | `ProductDetailPage.tsx` | Wrap multiple root elements trong return |

### Bug đã gặp & fix

- **MUI icon không tồn tại** → `DeleteOutline` → đúng là `DeleteOutlined`; `ShoppingBagOutlined` → `ShoppingCartOutlined`
- **JSX missing fragment wrapper** → Snackbar thêm ngoài `<Container>` mà không có `<>` → thêm `<>...</>` wrap
- **HMR cache không cập nhật** → Vite không detect thay đổi sau khi fix icon → restart Vite

---

## Phase 5 — Wishlist + Custom Hooks (✅ Hoàn thành)

### Mục tiêu
Quản lý danh sách yêu thích, học custom hooks và curried selector pattern.

### Những gì đã làm

**Kiểu dữ liệu mới** (`types/index.ts`):
```typescript
export interface WishlistProduct { id, name, price, stock, status }
export interface Wishlist { id: number; products: WishlistProduct[] }
```

**API layer** (`api/wishlist.ts`):
- `fetchWishlist()` → `GET /api/v1/wishlist`
- `addToWishlist(product_id)` → `POST /api/v1/wishlist/{id}`
- `removeFromWishlist(product_id)` → `DELETE /api/v1/wishlist/{id}`

**Zustand WishlistStore** (`stores/wishlistStore.ts`):
```typescript
// Curried selector — factory trả về selector function
export const selectIsWishlisted = (product_id: number) =>
    (s: WishlistState): boolean =>
        s.wishlist?.products.some(p => p.id === product_id) ?? false;
```
- `fetchWishlist`, `addItem`, `removeItem`, `resetWishlist`
- Server trả về wishlist đầy đủ sau mỗi thay đổi → set thẳng vào store

**Custom hooks** (`hooks/`):
- `useCart()` — bọc cartStore, expose `addToCart(id, qty)` + `loading`
- `useWishlist(product_id)` — expose `{ isWishlisted, toggle, loading }`
  - `toggle()` tự quyết định add/remove dựa vào `isWishlisted`

**WishlistPage** (`pages/WishlistPage.tsx`):
- Grid card: tên, giá, stock chip, "Xem sản phẩm" link, "Xóa" button
- Empty state với icon + link về Products

**ProductDetailPage** (cập nhật):
- Nút "Yêu thích" toggle: `FavoriteIcon` đỏ khi đã thích, `FavoriteBorderIcon` khi chưa
- Button `variant="contained" color="error"` khi `isWishlisted`

**Header** (cập nhật):
- `resetWishlist()` khi logout

**App.tsx** (cập nhật):
- Import `WishlistPage` thật thay cho inline placeholder

### Concepts học được

| Concept | File | Ghi chú |
|---------|------|---------|
| Curried selector | `wishlistStore.ts` | `selectIsWishlisted(42)` trả về `(state) => bool` |
| Custom hook | `useCart.ts`, `useWishlist.ts` | Tách logic khỏi UI, dễ test |
| Toggle pattern | `useWishlist.ts` | 1 hàm `toggle()` thay vì add/remove riêng |

---

## Phase 6 — Checkout + Orders (✅ Hoàn thành)

### Mục tiêu
Luồng đặt hàng từ giỏ → đơn hàng, xem danh sách và chi tiết đơn.

### Những gì đã làm

**Kiểu dữ liệu mới** (`types/index.ts`):
```typescript
export interface OrderItem { id, product_id, product_name, quantity, unit_price, subtotal }
export interface Order {
    id: string;  // UUID
    status: 0 | 1 | 2 | 3 | 4;  // Cancelled/Created/Paid/Shipped/Completed
    status_label: string;
    total_price: number;
    items: OrderItem[];
    payment_status: string | null;
    created_at: string | null;
}
```

**API layer** (`api/orders.ts`):
- `checkoutApi()` → `POST /api/v1/orders/checkout`
- `fetchOrders()` → `GET /api/v1/orders`
- `fetchOrder(id)` → `GET /api/v1/orders/{uuid}`

**CartPage** (cập nhật):
- Nút "Đặt hàng" gọi `checkoutApi()` → `resetCart()` → `navigate('/orders')`
- Snackbar lỗi nếu checkout thất bại (hết hàng, v.v.)

**OrdersPage** (`pages/OrdersPage.tsx`):
- Bảng đơn hàng với UUID rút gọn 8 ký tự
- Status chip màu: Cancelled=đỏ, Created=mặc định, Paid=xanh, Shipped=cam, Completed=xanh lá
- Link "Xem" → OrderDetailPage

**OrderDetailPage** (`pages/OrderDetailPage.tsx`):
- Breadcrumb Trang chủ > Đơn hàng > #{uuid}
- Card thông tin đơn (mã, trạng thái, ngày, thanh toán)
- Bảng sản phẩm với link đến ProductDetailPage
- Tổng cộng nổi bật

**App.tsx** (cập nhật):
- Route `/orders` → `OrdersPage`, `/orders/:id` → `OrderDetailPage`

**AppInit** (cập nhật — fix bug F5):
- Sau khi restore session: gọi `fetchCart()` ngay → badge hiển thị đúng

### Luồng Checkout
```
CartPage → POST /orders/checkout (server xóa cart, tạo order)
         → resetCart()           (Zustand: badge về 0 ngay)
         → navigate('/orders')   (xem danh sách đơn)
         → click "Xem"           → /orders/:uuid
```

### Concepts học được

| Concept | File | Ghi chú |
|---------|------|---------|
| UUID route param | `OrderDetailPage` | `:id` là chuỗi UUID đầy đủ |
| Status color map | `OrdersPage` | `Record<number, ChipColor>` để map status → màu |
| Cross-store side effect | `AppInit` | Gọi `fetchCart()` sau `setAuth()` trong session restore |

---

## Phase 7 — Admin Dashboard (✅ Hoàn thành)

### Mục tiêu
Trang quản trị cho admin (is_staff=True): CRUD sản phẩm, quản lý đơn hàng.

### Những gì đã làm

**API layer** (`api/admin.ts`):
- `adminCreateProduct(body)` → `POST /api/v1/admin/products`
- `adminUpdateProduct(id, body)` → `PATCH /api/v1/admin/products/{id}`
- `adminDeleteProduct(id)` → `DELETE /api/v1/admin/products/{id}` (soft delete)
- `adminReindex()` → `POST /api/v1/admin/products/reindex` (Elasticsearch sync)
- `adminListOrders(status?)` → `GET /api/v1/admin/orders`
- `adminUpdateOrderStatus(id, status)` → `PATCH /api/v1/admin/orders/{id}/status`

**AdminRoute** (`components/auth/AdminRoute.tsx`):
- Kiểm tra `isInitialized` → spinner
- Kiểm tra `accessToken` → redirect `/login`
- Kiểm tra `user.is_staff` → 403 page nếu không phải admin
- `<Outlet />` nếu đủ quyền

**AdminProductsPage** (`pages/admin/AdminProductsPage.tsx`):
- Bảng sản phẩm (ID, tên, giá, tồn kho, trạng thái, danh mục, thao tác)
- Nút "Thêm sản phẩm" → MUI Dialog với form đầy đủ
- Edit button → mở dialog điền sẵn data, PATCH chỉ các field đã thay đổi
- Delete button → `window.confirm()` → soft delete (status=0)
- Reindex button → đồng bộ Elasticsearch
- Snackbar feedback cho mọi thao tác

**AdminOrdersPage** (`pages/admin/AdminOrdersPage.tsx`):
- Bảng tất cả đơn hàng (mã, khách hàng, tổng tiền, trạng thái, ngày đặt)
- Dropdown inline cập nhật trạng thái ngay trên bảng
- Disable dropdown khi đang update để tránh double-submit

**Header** (cập nhật):
- User menu hiện thêm 2 link admin (màu vàng cam) nếu `user.is_staff === true`
- "Admin: Sản phẩm" → `/admin/products`
- "Admin: Đơn hàng" → `/admin/orders`

**App.tsx** (cập nhật):
```tsx
<Route element={<AdminRoute />}>
    <Route path="/admin/products" element={<AdminProductsPage />} />
    <Route path="/admin/orders" element={<AdminOrdersPage />} />
</Route>
```

### Concepts học được

| Concept | File | Ghi chú |
|---------|------|---------|
| Role-based guard | `AdminRoute.tsx` | Mở rộng ProtectedRoute với điều kiện `is_staff` |
| Dialog form | `AdminProductsPage` | MUI Dialog + controlled form, create/edit chung 1 component |
| Partial PATCH | `AdminProductsPage` | Chỉ gửi fields đã thay đổi, không gửi toàn bộ form |
| Inline select update | `AdminOrdersPage` | Dropdown trực tiếp trong table row, không cần modal |
| Optimistic local update | Cả hai trang | `setProducts/setOrders` sau API success, không re-fetch toàn bộ |

---

## Roadmap

- [x] Phase 1 — Layout, Theme, Routing
- [x] Phase 2 — Data Fetching, ProductsPage, ProductDetailPage
- [x] Phase 3 — Auth: Login/Register, JWT storage, ProtectedRoute, Session Restore
- [x] Phase 4 — Global State: Zustand, CartPage
- [x] Phase 5 — Wishlist + Custom Hooks
- [x] Phase 6 — Checkout, Orders
- [x] Phase 7 — Admin Dashboard (Products CRUD + Orders management)

---

## Cấu trúc file hiện tại

```
src/
  api/
    axios.ts          ← axios instance, baseURL, interceptors (JWT auto-refresh)
    products.ts       ← fetchProducts, fetchProduct, fetchCategories
    cart.ts           ← fetchCart, addToCart, updateCartItem, removeCartItem, clearCart
    wishlist.ts       ← fetchWishlist, addToWishlist, removeFromWishlist
    orders.ts         ← checkoutApi, fetchOrders, fetchOrder
    admin.ts          ← adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
                         adminReindex, adminListOrders, adminUpdateOrderStatus
  components/
    auth/
      ProtectedRoute.tsx  ← guard: yêu cầu đăng nhập
      AdminRoute.tsx      ← guard: yêu cầu is_staff=True
    layout/
      Header.tsx      ← AppBar, nav, cart badge, wishlist, user menu (+ admin links)
      Footer.tsx      ← 3-column footer
      Layout.tsx      ← Outlet wrapper
    product/
      ProductCard.tsx ← reusable product card
  hooks/
    useCart.ts        ← custom hook bọc cartStore
    useWishlist.ts    ← custom hook: { isWishlisted, toggle, loading }
  pages/
    HomePage.tsx
    ProductsPage.tsx
    ProductDetailPage.tsx ← add-to-cart + wishlist toggle
    LoginPage.tsx
    RegisterPage.tsx
    CartPage.tsx          ← checkout button
    WishlistPage.tsx
    OrdersPage.tsx        ← danh sách đơn hàng
    OrderDetailPage.tsx   ← chi tiết đơn hàng + breadcrumb
    admin/
      AdminProductsPage.tsx  ← CRUD sản phẩm + Reindex
      AdminOrdersPage.tsx    ← quản lý đơn hàng + cập nhật trạng thái
  stores/
    authStore.ts      ← Zustand: user, accessToken, setAuth, clearAuth
    cartStore.ts      ← Zustand: cart, selectTotalItems
    wishlistStore.ts  ← Zustand: wishlist, selectIsWishlisted (curried)
  theme/
    index.ts          ← MUI createTheme()
  types/
    index.ts          ← User, Product, Category, CartItem, Cart,
                         WishlistProduct, Wishlist, OrderItem, Order
  App.tsx             ← BrowserRouter + Routes (public, protected, admin)
  main.tsx            ← ThemeProvider + CssBaseline entry point
```

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
