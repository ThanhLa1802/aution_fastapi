// src/components/auth/AdminRoute.tsx
// Concept: AdminRoute = ProtectedRoute + kiểm tra thêm is_staff
// Nếu chưa đăng nhập → redirect /login
// Nếu đăng nhập nhưng không phải staff → 403 page
// Nếu là staff → render <Outlet />
import { Navigate, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuthStore } from '../../stores/authStore';

const AdminRoute = () => {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const isInitialized = useAuthStore((s) => s.isInitialized);

    // Chờ session restore xong
    if (!isInitialized) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Chưa đăng nhập → về login
    if (!accessToken) return <Navigate to="/login" replace />;

    // Đăng nhập nhưng không phải staff → 403
    if (!user?.is_staff) {
        return (
            <Box sx={{ textAlign: 'center', py: 14 }}>
                <Typography variant="h1" fontWeight={700} color="error">403</Typography>
                <Typography variant="h5" gutterBottom>Không có quyền truy cập</Typography>
                <Typography color="text.secondary">Trang này chỉ dành cho Admin.</Typography>
            </Box>
        );
    }

    return <Outlet />;
};

export default AdminRoute;
