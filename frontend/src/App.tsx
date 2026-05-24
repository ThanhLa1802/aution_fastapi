import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
import { refreshAccessToken, fetchMe } from './api/auth';

import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AdminRoute from './components/auth/AdminRoute';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
const NotFoundPage = () => (
  <Box sx={{ textAlign: 'center', py: 14 }}>
    <Typography variant="h1" fontWeight={700} color="primary">404</Typography>
    <Typography variant="h5" gutterBottom>Trang không tồn tại</Typography>
    <Button component={RouterLink} to="/" variant="contained" sx={{ mt: 2 }}>Về trang chủ</Button>
  </Box>
);

// ─── Session Restore ──────────────────────────────────────────────────────────
// F5 → accessToken trong memory bị mất, nhưng refreshToken vẫn trong localStorage
// → Tự động lấy accessToken mới khi app khởi động
const AppInit = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const restore = async () => {
      const stored = localStorage.getItem('refreshToken');
      if (stored) {
        try {
          const newAccess = await refreshAccessToken(stored);
          const user = await fetchMe(newAccess);
          setAuth(user, newAccess);
          // Fetch cart ngay sau khi restore session để badge hiển thị đúng
          useCartStore.getState().fetchCart();
        } catch {
          localStorage.removeItem('refreshToken'); // token hết hạn
        }
      }
      setInitialized(); // dù thành công hay fail đều phải set initialized
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null; // component này không render UI
};

function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — cần đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Admin routes — cần is_staff=true */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;