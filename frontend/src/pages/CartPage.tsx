import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useCartStore } from '../stores/cartStore';
import { checkoutApi } from '../api/orders';
import type { CartItem } from '../types';

const formatPrice = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// ─── CartItemRow ──────────────────────────────────────────────────────────────
// Component con nhỏ, tách ra để CartPage gọn hơn
// Concept: mỗi row tự quản lý busy state → tránh spam click trong khi API đang chạy
interface CartItemRowProps {
    item: CartItem;
}

const CartItemRow = ({ item }: CartItemRowProps) => {
    const updateItem = useCartStore((s) => s.updateItem);
    const removeItem = useCartStore((s) => s.removeItem);

    // busy: tránh gọi API nhiều lần khi đang chờ response
    const [busy, setBusy] = useState(false);

    // Wrapper: set busy trước → gọi action → bỏ busy
    const handle = async (fn: () => Promise<void>) => {
        if (busy) return;
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
            {/* Tên sản phẩm + đơn giá */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>{item.product_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {formatPrice(item.product_price)} / sp
                </Typography>
            </Box>

            {/* Quantity stepper: − [số] + */}
            {/* Concept: 3 element liên quan gom vào 1 Box → dễ align */}
            <Box sx={{ display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <IconButton
                    size="small"
                    disabled={busy}
                    onClick={() => handle(() => updateItem(item.id, item.quantity - 1))}
                >
                    <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ minWidth: 32, textAlign: 'center', userSelect: 'none' }}>
                    {item.quantity}
                </Typography>
                <IconButton
                    size="small"
                    disabled={busy}
                    onClick={() => handle(() => updateItem(item.id, item.quantity + 1))}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Thành tiền */}
            <Typography fontWeight={700} sx={{ minWidth: 110, textAlign: 'right' }}>
                {formatPrice(item.subtotal)}
            </Typography>

            {/* Xóa item */}
            <IconButton
                color="error"
                size="small"
                disabled={busy}
                onClick={() => handle(() => removeItem(item.id))}
                title="Xóa sản phẩm"
            >
                <DeleteOutlinedIcon />
            </IconButton>
        </Box>
    );
};

// ─── CartPage ─────────────────────────────────────────────────────────────────
const CartPage = () => {
    // Concept: lấy từng selector riêng lẻ thay vì lấy toàn bộ store
    // → component chỉ re-render khi đúng field đó thay đổi
    const cart = useCartStore((s) => s.cart);
    const loading = useCartStore((s) => s.loading);
    const fetchCart = useCartStore((s) => s.fetchCart);
    const clearItems = useCartStore((s) => s.clearItems);
    const resetCart = useCartStore((s) => s.resetCart);

    const navigate = useNavigate();
    const [clearing, setClearing] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
        { open: false, message: '', severity: 'success' }
    );

    // Fetch cart khi trang mở — useEffect với deps [] = chạy 1 lần khi mount
    useEffect(() => {
        fetchCart();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClear = async () => {
        if (!window.confirm('Xóa toàn bộ giỏ hàng?')) return;
        setClearing(true);
        try {
            await clearItems();
        } finally {
            setClearing(false);
        }
    };

    // Checkout: gọi API → xóa cart local → điếu hướng /orders
    const handleCheckout = async () => {
        setCheckingOut(true);
        try {
            await checkoutApi();
            resetCart(); // xóa cart trong Zustand ngay để badge về 0
            navigate('/orders');
        } catch (err) {
            setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
        } finally {
            setCheckingOut(false);
        }
    };

    // Loading skeleton: chỉ hiện khi lần đầu load (chưa có cart)
    if (loading && !cart) {
        return (
            <Container maxWidth="md" sx={{ py: 5 }}>
                <Skeleton height={60} width="30%" />
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={80} sx={{ mt: 1, borderRadius: 1 }} />
                ))}
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Typography variant="h4" fontWeight={700} mb={3}>
                Giỏ hàng
            </Typography>

            {/* Empty state */}
            {(!cart || cart.items.length === 0) ? (
                <Paper elevation={0} sx={{ p: 8, textAlign: 'center', border: 1, borderColor: 'divider', borderRadius: 3 }}>
                    <ShoppingCartOutlinedIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Giỏ hàng của bạn đang trống
                    </Typography>
                    <Typography variant="body2" color="text.disabled" mb={3}>
                        Hãy thêm sản phẩm vào giỏ để tiếp tục mua sắm
                    </Typography>
                    <Button variant="contained" size="large" component={RouterLink} to="/products">
                        Khám phá sản phẩm
                    </Button>
                </Paper>
            ) : (
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    {/* Danh sách item */}
                    {cart.items.map((item, idx) => (
                        <Box key={item.id}>
                            <CartItemRow item={item} />
                            {idx < cart.items.length - 1 && <Divider />}
                        </Box>
                    ))}

                    <Divider sx={{ my: 2 }} />

                    {/* Footer: xóa giỏ / tổng tiền / đặt hàng */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}>
                        <Button
                            color="error"
                            variant="outlined"
                            disabled={clearing}
                            onClick={handleClear}
                        >
                            {clearing ? 'Đang xóa...' : 'Xóa giỏ hàng'}
                        </Button>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Tổng cộng ({cart.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)
                                </Typography>
                                <Typography variant="h5" fontWeight={700} color="primary.main">
                                    {formatPrice(cart.total)}
                                </Typography>
                            </Box>
                            {/* Phase 6 — checkout */}
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<ShoppingBagOutlinedIcon />}
                                disabled={checkingOut}
                                onClick={handleCheckout}
                            >
                                {checkingOut ? 'Đang xử lý...' : 'Đặt hàng'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Snackbar thông báo lỗi checkout */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default CartPage;
