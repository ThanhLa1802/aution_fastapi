import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, Alert,
  Button, TablePagination,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as ordersAPI from '../api/orders';

const STATUS_COLOR = {
  0: 'error', 1: 'default', 2: 'info', 3: 'warning', 4: 'success',
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    ordersAPI.getOrders({ limit: rowsPerPage, offset: page * rowsPerPage })
      .then(setOrders)
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>My Orders</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {orders.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Typography color="text.secondary" variant="h6">No orders yet</Typography>
          <Button variant="contained" sx={{ mt: 2, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)' }} onClick={() => navigate('/')}>
            Start Shopping
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FFF5F3' }}>
                <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>{order.items?.length ?? 0}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ${Number(order.total_price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status_label}
                      color={STATUS_COLOR[order.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {order.payment_status ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={-1}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10]}
            labelDisplayedRows={({ from }) => `From ${from}`}
          />
        </TableContainer>
      )}
    </Box>
  );
}
