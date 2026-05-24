// src/pages/OrderDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchOrder } from '../api/orders';
import type { Order } from '../types';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso));
};

const STATUS_COLOR: Record<number, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    0: 'error', 1: 'default', 2: 'info', 3: 'warning', 4: 'success',
};

const OrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        fetchOrder(id)
            .then(setOrder)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Skeleton height={40} width="50%" sx={{ mb: 3 }} />
            <Skeleton height={200} />
        </Container>
    );

    if (error) return (
        <Container sx={{ py: 5 }}>
            <Alert severity="error">{error}</Alert>
        </Container>
    );

    if (!order) return null;

    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link component={RouterLink} to="/" underline="hover" color="inherit">Trang chủ</Link>
                <Link component={RouterLink} to="/orders" underline="hover" color="inherit">Đơn hàng</Link>
                <Typography color="text.primary">
                    #{order.id.slice(0, 8).toUpperCase()}
                </Typography>
            </Breadcrumbs>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                    Chi tiết đơn hàng
                </Typography>
                <Button
                    startIcon={<ArrowBackIcon />}
                    component={RouterLink}
                    to="/orders"
                    variant="outlined"
                    size="small"
                >
                    Quay lại
                </Button>
            </Box>

            {/* Order info card */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary">Mã đơn hàng</Typography>
                        <Typography fontFamily="monospace" fontWeight={600}>
                            {order.id.toUpperCase()}
                        </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary">Trạng thái</Typography>
                        <Chip
                            label={order.status_label}
                            color={STATUS_COLOR[order.status] ?? 'default'}
                            size="small"
                            sx={{ mt: 0.5 }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary">Ngày đặt</Typography>
                        <Typography>{formatDate(order.created_at)}</Typography>
                    </Grid>

                    {order.payment_status && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography variant="body2" color="text.secondary">Thanh toán</Typography>
                            <Typography>{order.payment_status}</Typography>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {/* Order items table */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Sản phẩm trong đơn
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                            <TableCell>Sản phẩm</TableCell>
                            <TableCell align="center">SL</TableCell>
                            <TableCell align="right">Đơn giá</TableCell>
                            <TableCell align="right">Thành tiền</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {order.items.map((item) => (
                            <TableRow key={item.id} sx={{ '&:last-child td': { border: 0 } }}>
                                <TableCell>
                                    <Link
                                        component={RouterLink}
                                        to={`/products/${item.product_id}`}
                                        underline="hover"
                                        color="inherit"
                                    >
                                        {item.product_name}
                                    </Link>
                                </TableCell>
                                <TableCell align="center">{item.quantity}</TableCell>
                                <TableCell align="right">{formatPrice(item.unit_price)}</TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight={600}>
                                        {formatPrice(item.subtotal)}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Total */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Paper variant="outlined" sx={{ px: 4, py: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Typography variant="h6">Tổng cộng:</Typography>
                        <Typography variant="h5" fontWeight={800} color="primary.main">
                            {formatPrice(order.total_price)}
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default OrderDetailPage;
