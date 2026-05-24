import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import { login, fetchMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

// ─── Concept: Controlled Form ─────────────────────────────────────────────────
// React "kiểm soát" input: value = state, onChange = setState
// Luồng: gõ phím → onChange → setState → re-render → input hiện value mới
// Khác uncontrolled form (dùng ref): controlled dễ validate và test hơn

const LoginPage = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    // Form state — mỗi field là 1 state riêng
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // ngăn browser reload trang khi submit form
        setError(null);
        setLoading(true);

        try {
            // 1. Lấy tokens từ Django
            const tokens = await login(username, password);

            // 2. Lưu refreshToken vào localStorage (tồn tại sau F5)
            localStorage.setItem('refreshToken', tokens.refresh);

            // 3. Lấy thông tin user với accessToken vừa nhận
            const user = await fetchMe(tokens.access);

            // 4. Lưu user + accessToken vào Zustand (memory only)
            setAuth(user, tokens.access);

            // 5. Điều hướng về trang chủ
            navigate('/');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ py: 8 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>
                    Đăng nhập
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* onSubmit trên <form> — bắt cả Enter lẫn click nút */}
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        autoComplete="username"
                    />
                    <TextField
                        label="Mật khẩu"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ mt: 1 }}
                    >
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </Button>
                </Box>

                <Typography variant="body2" textAlign="center" mt={2} color="text.secondary">
                    Chưa có tài khoản?{' '}
                    <RouterLink to="/register" style={{ color: 'inherit' }}>Đăng ký</RouterLink>
                </Typography>
            </Paper>
        </Container>
    );
};

export default LoginPage;