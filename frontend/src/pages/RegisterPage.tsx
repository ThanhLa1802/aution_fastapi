import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import { registerUser, fetchMe } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const RegisterPage = () => {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const [form, setForm] = useState({
        username: '', email: '', password: '', confirmPassword: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Dùng 1 handler cho nhiều field — tránh viết onChange riêng cho từng field
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);
        try {
            const tokens = await registerUser({
                username: form.username,
                email: form.email,
                password: form.password,
            });
            localStorage.setItem('refreshToken', tokens.refresh);
            const user = await fetchMe(tokens.access);
            setAuth(user, tokens.access);
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
                    Đăng ký tài khoản
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField name="username" label="Tên đăng nhập" value={form.username} onChange={handleChange} required autoFocus />
                    <TextField name="email" label="Email" type="email" value={form.email} onChange={handleChange} required />
                    <TextField name="password" label="Mật khẩu" type="password" value={form.password} onChange={handleChange} required />
                    <TextField name="confirmPassword" label="Xác nhận mật khẩu" type="password" value={form.confirmPassword} onChange={handleChange} required />
                    <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                        {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
                    </Button>
                </Box>

                <Typography variant="body2" textAlign="center" mt={2} color="text.secondary">
                    Đã có tài khoản?{' '}
                    <RouterLink to="/login" style={{ color: 'inherit' }}>Đăng nhập</RouterLink>
                </Typography>
            </Paper>
        </Container>
    );
};

export default RegisterPage;