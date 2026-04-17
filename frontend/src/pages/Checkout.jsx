import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Divider, CircularProgress,
  Alert, List, ListItem, ListItemText, TextField, Collapse,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useNavigate } from 'react-router-dom';
import * as ordersAPI from '../api/orders';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const EMPTY_ADDRESS = { street: '', city: '', state: '', zip_code: '', country: '' };

export default function Checkout() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { cart, fetchCart, reset } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [showAddress, setShowAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);

  useEffect(() => {
    if (accessToken && !cart) {
      setLoading(true);
      fetchCart().finally(() => setLoading(false));
    }
  }, [accessToken]);

  const items = cart?.items ?? [];

  const handleAddressChange = (e) => {
    setAddressForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      // Only send address if the user filled in the required fields
      const hasAddress = showAddress && addressForm.street.trim() && addressForm.city.trim() && addressForm.country.trim();
      const order = await ordersAPI.checkout(hasAddress ? addressForm : null);
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

        {/* Optional shipping address */}
        <Divider sx={{ mb: 2 }} />
        <Box mb={3}>
          <Button
            startIcon={<LocalShippingIcon />}
            size="small"
            variant={showAddress ? 'contained' : 'outlined'}
            color="secondary"
            onClick={() => setShowAddress((v) => !v)}
            sx={{ mb: 1 }}
          >
            {showAddress ? 'Remove Shipping Address' : 'Add Shipping Address (optional)'}
          </Button>
          <Collapse in={showAddress}>
            <Box display="flex" flexDirection="column" gap={1.5} mt={1.5}>
              <TextField
                label="Street" name="street" size="small" fullWidth
                value={addressForm.street} onChange={handleAddressChange}
                inputProps={{ maxLength: 200 }}
                required
              />
              <Box display="flex" gap={1.5}>
                <TextField
                  label="City" name="city" size="small" fullWidth
                  value={addressForm.city} onChange={handleAddressChange}
                  inputProps={{ maxLength: 100 }}
                  required
                />
                <TextField
                  label="State / Province" name="state" size="small" fullWidth
                  value={addressForm.state} onChange={handleAddressChange}
                  inputProps={{ maxLength: 100 }}
                />
              </Box>
              <Box display="flex" gap={1.5}>
                <TextField
                  label="ZIP / Postal Code" name="zip_code" size="small" fullWidth
                  value={addressForm.zip_code} onChange={handleAddressChange}
                  inputProps={{ maxLength: 20 }}
                />
                <TextField
                  label="Country" name="country" size="small" fullWidth
                  value={addressForm.country} onChange={handleAddressChange}
                  inputProps={{ maxLength: 100 }}
                  required
                />
              </Box>
            </Box>
          </Collapse>
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
