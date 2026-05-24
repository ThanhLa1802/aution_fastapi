// src/pages/admin/AdminOrdersPage.tsx
import { useState, useEffect } from 'react';
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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { adminListOrders, adminUpdateOrderStatus, type AdminOrder } from '../../api/admin';

const formatPrice = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
};

// status: 0=Cancelled 1=Created 2=Paid 3=Shipped 4=Completed
const STATUS_OPTIONS = [
    { value: 0, label: 'Cancelled', color: 'error' },
    { value: 1, label: 'Created', color: 'default' },
    { value: 2, label: 'Paid', color: 'info' },
    { value: 3, label: 'Shipped', color: 'warning' },
    { value: 4, label: 'Completed', color: 'success' },
] as const;

const STATUS_COLOR = { 0: 'error', 1: 'default', 2: 'info', 3: 'warning', 4: 'success' } as const;

const AdminOrdersPage = () => {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null); // order id đang update

    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
        { open: false, message: '', severity: 'success' }
    );
    const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
        setSnack({ open: true, message, severity });

    useEffect(() => {
        adminListOrders()
            .then(setOrders)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleStatusChange = async (order: AdminOrder, newStatus: number) => {
        setUpdating(order.id);
        try {
            const updated = await adminUpdateOrderStatus(order.id, newStatus);
            setOrders((prev) => prev.map((o) => o.id === order.id ? updated : o));
            showSnack(`Cập nhật đơn #${order.id.slice(0, 8).toUpperCase()} → ${updated.status_label}`);
        } catch (err) {
            showSnack((err as Error).message, 'error');
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ReceiptLongOutlinedIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>Quản lý đơn hàng</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {orders.length > 0 ? `${orders.length} đơn hàng` : ''}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box>{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}</Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                                <TableCell>Mã đơn</TableCell>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell align="right">Tổng tiền</TableCell>
                                <TableCell align="center">Trạng thái hiện tại</TableCell>
                                <TableCell align="center">Cập nhật trạng thái</TableCell>
                                <TableCell align="center">Ngày đặt</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell>
                                        <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {order.username}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {order.user_id}
                                        </Typography>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Typography fontWeight={600} color="primary.main" variant="body2">
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

                                    {/* Dropdown cập nhật trạng thái */}
                                    <TableCell align="center">
                                        <Select
                                            size="small"
                                            value={order.status}
                                            disabled={updating === order.id}
                                            onChange={(e) => handleStatusChange(order, Number(e.target.value))}
                                            sx={{ minWidth: 130 }}
                                        >
                                            {STATUS_OPTIONS.map((opt) => (
                                                <MenuItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>

                                    <TableCell align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {formatDate(order.created_at)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} variant="filled"
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminOrdersPage;
