import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Divider, CircularProgress,
  Alert, List, ListItem, ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import * as ordersAPI from '../api/orders';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Checkout() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { cart, fetchCart, reset } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken && !cart) {
      setLoading(true);
      fetchCart().finally(() => setLoading(false));
    }
  }, [accessToken]);

  const items = cart?.items ?? [];

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const order = await ordersAPI.checkout();
      reset();
      navigate(`/orders/${order.id}`, { state: { success: true } });
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Checkout failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

  if (items.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Typography variant="h6" color="text.secondary">Your cart is empty.</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/')}>
          Shop Now
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center">
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 560 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Review Your Order</Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <List disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} disableGutters sx={{ py: 0.75 }}>
              <ListItemText
                primary={item.product_name}
                secondary={`Qty: ${item.quantity} × $${Number(item.product_price).toFixed(2)}`}
              />
              <Typography fontWeight={600}>${Number(item.subtotal).toFixed(2)}</Typography>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">Shipping</Typography>
          <Typography variant="body2" color="success.main" fontWeight={600}>Free</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>Total</Typography>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            ${Number(cart.total).toFixed(2)}
          </Typography>
        </Box>

        <Box mt={1} mb={3}>
          <Typography variant="body2" color="text.secondary">
            Payment: Mock (test mode) — no real charge
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<CheckCircleIcon />}
          onClick={handlePlaceOrder}
          disabled={placing}
          sx={{ backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', '&:hover': { filter: 'brightness(1.08)' } }}
        >
          {placing ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
        </Button>
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 1 }}
          onClick={() => navigate('/cart')}
        >
          Back to Cart
        </Button>
      </Paper>
    </Box>
  );
}
