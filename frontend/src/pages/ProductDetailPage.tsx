// src/pages/ProductDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { fetchProduct } from '../api/products';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useWishlist } from '../hooks/useWishlist';
import type { Product } from '../types';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const ProductDetailPage = () => {
    // ─── useParams ──────────────────────────────────────────────────────────────
    // Đọc :id từ URL "/products/42" → { id: "42" }
    // Lưu ý: params luôn là string → cần Number() để chuyển sang number
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quantity state — số lượng muốn thêm vào giỏ
    const [qty, setQty] = useState(1);
    const [addLoading, setAddLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
        { open: false, message: '', severity: 'success' }
    );

    const accessToken = useAuthStore((s) => s.accessToken);
    const addItem = useCartStore((s) => s.addItem);

    // useWishlist hook — curried selector bên trong tự phát hiện isWishlisted
    // product?.id dùng 0 làm fallback an toàn (wishlist sẽ không có id=0)
    const { isWishlisted, toggle: toggleWishlist, loading: wishlistLoading } =
        useWishlist(product?.id ?? 0);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetchProduct(Number(id))
            .then(setProduct)
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]); // chạy lại khi id trên URL thay đổi

    if (loading) return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            <Grid container spacing={5}>
                <Grid size={{ xs: 12, md: 5 }}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} /></Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Skeleton height={50} width="70%" />
                    <Skeleton height={30} width="40%" sx={{ mt: 1 }} />
                    <Skeleton height={120} sx={{ mt: 2 }} />
                </Grid>
            </Grid>
        </Container>
    );

    if (error) return (
        <Container sx={{ py: 5 }}>
            <Alert severity="error">{error}</Alert>
        </Container>
    );

    if (!product) return null;

    const outOfStock = product.status === 0 || product.stock === 0;

    return (
        <>
            <Container maxWidth="lg" sx={{ py: 5 }}>
                {/* Breadcrumbs: Trang chủ > Sản phẩm > Tên sản phẩm */}
                <Breadcrumbs sx={{ mb: 3 }}>
                    <Link component={RouterLink} to="/" underline="hover" color="inherit">Trang chủ</Link>
                    <Link component={RouterLink} to="/products" underline="hover" color="inherit">Sản phẩm</Link>
                    <Typography color="text.primary">{product.name}</Typography>
                </Breadcrumbs>

                <Grid container spacing={5}>
                    {/* Ảnh sản phẩm */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Box
                            component="img"
                            src={product.image || `https://placehold.co/600x500?text=${encodeURIComponent(product.name)}`}
                            alt={product.name}
                            sx={{ width: '100%', borderRadius: 3, boxShadow: 3 }}
                        />
                    </Grid>

                    {/* Thông tin sản phẩm */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            {product.name}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip
                                label={outOfStock ? 'Hết hàng' : `Còn ${product.stock} sản phẩm`}
                                color={outOfStock ? 'default' : 'success'}
                                size="small"
                            />
                        </Box>

                        <Typography variant="h4" color="primary.main" fontWeight={800} gutterBottom>
                            {formatPrice(product.price)}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
                            {product.description}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {/* Phase 4: onClick sẽ gọi cartStore.addItem(product) */}
                            {/* Quantity stepper */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="body2" color="text.secondary" mr={1}>Số lượng:</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                                    <IconButton size="small" disabled={qty <= 1 || outOfStock}
                                        onClick={() => setQty((q) => Math.max(1, q - 1))}>
                                        <RemoveIcon fontSize="small" />
                                    </IconButton>
                                    <Typography sx={{ minWidth: 36, textAlign: 'center' }}>{qty}</Typography>
                                    <IconButton size="small" disabled={qty >= (product.stock || 99) || outOfStock}
                                        onClick={() => setQty((q) => q + 1)}>
                                        <AddIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                                <Typography variant="caption" color="text.disabled">
                                    (còn {product.stock} sản phẩm)
                                </Typography>
                            </Box>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddShoppingCartIcon />}
                                disabled={outOfStock || addLoading}
                                sx={{ px: 4 }}
                                onClick={async () => {
                                    // Chưa đăng nhập → điều hướng login
                                    if (!accessToken) {
                                        navigate('/login');
                                        return;
                                    }
                                    setAddLoading(true);
                                    try {
                                        await addItem(product.id, qty);
                                        setSnackbar({ open: true, message: `Đã thêm ${qty} “${product.name}” vào giỏ!`, severity: 'success' });
                                        setQty(1); // reset số lượng về 1 sau khi thêm
                                    } catch (err) {
                                        setSnackbar({ open: true, message: (err as Error).message, severity: 'error' });
                                    } finally {
                                        setAddLoading(false);
                                    }
                                }}
                            >
                                {addLoading ? 'Đang thêm...' : outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                            </Button>

                            {/* Phase 5: toggle yêu thích — icon đổi màu khi đã thêm */}
                            <Button
                                variant={isWishlisted ? 'contained' : 'outlined'}
                                color={isWishlisted ? 'error' : 'inherit'}
                                size="large"
                                startIcon={isWishlisted ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                disabled={!accessToken || wishlistLoading}
                                onClick={async () => {
                                    if (!accessToken) { navigate('/login'); return; }
                                    await toggleWishlist();
                                }}
                            >
                                {isWishlisted ? 'Đã yêu thích' : 'Yêu thích'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* Snackbar: thông báo thêm vào giỏ thành công/thất bại */}
            {/* Concept: Snackbar = toast notification — tự đóng sau autoHideDuration ms */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default ProductDetailPage;