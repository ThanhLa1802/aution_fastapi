import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import useAuthStore from './store/authStore';
import useCartStore from './store/cartStore';
import * as authAPI from './api/auth';
import ChatPopup from './components/ChatPopup';

export default function App() {
  const { refreshToken, setAccessToken, setUser, logout } = useAuthStore();
  const { fetchCart } = useCartStore();

  // On app load, silently restore session from persisted refreshToken
  useEffect(() => {
    if (!refreshToken) return;

    authAPI.refreshAccessToken(refreshToken)
      .then(({ access }) => {
        setAccessToken(access);
        return Promise.all([authAPI.getMe(), fetchCart()]);
      })
      .then(([user]) => setUser(user))
      .catch(() => logout());
  }, []); // run once on mount

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Navbar />
      <Box component="main" sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 1, sm: 1.5, md: 2 }, py: 2 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </Box>
      <ChatPopup />
    </Box>
  );
}
