import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Divider, Button, CircularProgress,
  Alert, Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import * as ordersAPI from '../api/orders';

const STATUS_COLOR = {
  0: 'error', 1: 'default', 2: 'info', 3: 'warning', 4: 'success',
};

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const justPlaced = location.state?.success;

  useEffect(() => {
    ordersAPI.getOrder(id)
      .then(setOrder)
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      const updated = await ordersAPI.cancelOrder(id);
      setOrder(updated);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error && !order) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!order) return null;

  const canCancel = order.status === 1 || order.status === 2;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')} sx={{ mb: 2 }}>
        All Orders
      </Button>

      {justPlaced && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Order placed successfully! Thank you for your purchase.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Order #{order.id}</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Placed: {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
            </Typography>
          </Box>
          <Box display="flex" gap={1} alignItems="center">
            <Chip
              label={order.status_label}
              color={STATUS_COLOR[order.status]}
              sx={{ fontWeight: 700 }}
            />
            {canCancel && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Items table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">${Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ${Number(item.subtotal).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        {/* Footer */}
        <Box display="flex" justifyContent="flex-end" flexDirection="column" alignItems="flex-end" gap={0.5}>
          <Box display="flex" gap={4}>
            <Typography color="text.secondary">Payment</Typography>
            <Typography fontWeight={600}>{order.payment_status ?? '—'}</Typography>
          </Box>
          <Box display="flex" gap={4}>
            <Typography variant="h6" fontWeight={700}>Total</Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              ${Number(order.total_price).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
