import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Concept: conditional rendering dựa trên auth state
//
//   isInitialized = false  → đang restore session (F5) → hiện spinner
//   accessToken = null     → chưa đăng nhập → redirect /login
//   accessToken = có       → đã đăng nhập → render <Outlet /> (trang thật)
//
// Dùng trong App.tsx:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/cart" element={<CartPage />} />
//   </Route>

const ProtectedRoute = () => {
    const accessToken = useAuthStore((s) => s.accessToken);
    const isInitialized = useAuthStore((s) => s.isInitialized);

    if (!isInitialized) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!accessToken) {
        // replace: không lưu vào history — back button không quay về trang bị chặn
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;