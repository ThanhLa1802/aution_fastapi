// src/pages/OrdersPage.tsx
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { fetchOrders } from '../api/orders';
import type { Order } from '../types';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
};

// ─── Status chip color mapping ────────────────────────────────────────────────
// status: 0=Cancelled 1=Created 2=Paid 3=Shipped 4=Completed
const STATUS_COLOR: Record<number, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    0: 'error',
    1: 'default',
    2: 'info',
    3: 'warning',
    4: 'success',
};

const OrdersPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOrders()
            .then(setOrders)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ReceiptLongOutlinedIcon color="primary" />
                <Typography variant="h4" fontWeight={700}>Đơn hàng của tôi</Typography>
            </Box>
            <Divider sx={{ mb: 4 }} />

            {/* Error */}
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Loading */}
            {loading && (
                <Box>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} height={60} sx={{ mb: 1, borderRadius: 1 }} />
                    ))}
                </Box>
            )}

            {/* Empty state */}
            {!loading && !error && orders.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <ReceiptLongOutlinedIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Chưa có đơn hàng nào
                    </Typography>
                    <Button variant="contained" component={RouterLink} to="/products" sx={{ mt: 2 }}>
                        Mua sắm ngay
                    </Button>
                </Box>
            )}

            {/* Orders table */}
            {!loading && orders.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                                <TableCell>Mã đơn hàng</TableCell>
                                <TableCell align="center">Sản phẩm</TableCell>
                                <TableCell align="right">Tổng tiền</TableCell>
                                <TableCell align="center">Trạng thái</TableCell>
                                <TableCell align="center">Ngày đặt</TableCell>
                                <TableCell align="center">Chi tiết</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow
                                    key={order.id}
                                    hover
                                    sx={{ '&:last-child td': { border: 0 } }}
                                >
                                    {/* UUID ngắn gọn — 8 ký tự đầu */}
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            fontFamily="monospace"
                                            color="text.secondary"
                                        >
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2">
                                            {order.items.length} sản phẩm
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Typography fontWeight={600} color="primary.main">
                                            {formatPrice(order.total_price)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Chip
                                            label={order.status_label}
                                            color={STATUS_COLOR[order.status] ?? 'default'}
                                            size="small"
                                        />
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDate(order.created_at)}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<VisibilityOutlinedIcon />}
                                            component={RouterLink}
                                            to={`/orders/${order.id}`}
                                        >
                                            Xem
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
};

export default OrdersPage;
