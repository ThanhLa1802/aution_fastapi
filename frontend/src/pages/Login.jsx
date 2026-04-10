import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Divider, Link,
} from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import * as authAPI from '../api/auth';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, setUser } = useAuthStore();
  const { fetchCart } = useCartStore();

  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname ?? '/';

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { access, refresh } = await authAPI.login(form.username, form.password);
      setTokens(access, refresh);
      const user = await authAPI.getMe();
      setUser(user);
      await fetchCart();
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          err.response?.data?.non_field_errors?.[0] ??
          'Invalid username or password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ height: 4, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', borderRadius: '2px 2px 0 0', mx: -4, mt: -4, mb: 3 }} />
          <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
            Sign in
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', '&:hover': { filter: 'brightness(1.08)' } }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography textAlign="center" variant="body2">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" fontWeight={600}>
              Register
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
