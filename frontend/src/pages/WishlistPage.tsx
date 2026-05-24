// src/pages/WishlistPage.tsx
import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useWishlistStore } from '../stores/wishlistStore';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const WishlistPage = () => {
    const wishlist = useWishlistStore((s) => s.wishlist);
    const loading = useWishlistStore((s) => s.loading);
    const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
    const removeItem = useWishlistStore((s) => s.removeItem);

    // Fetch wishlist khi trang mount
    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FavoriteIcon color="error" />
                <Typography variant="h4" fontWeight={700}>
                    Sản phẩm yêu thích
                </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {wishlist ? `${wishlist.products.length} sản phẩm` : ''}
            </Typography>
            <Divider sx={{ mb: 4 }} />

            {/* Loading skeletons */}
            {loading && (
                <Grid container spacing={3}>
                    {[1, 2, 3].map((i) => (
                        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Empty state */}
            {!loading && (!wishlist || wishlist.products.length === 0) && (
                <Box sx={{ textAlign: 'center', py: 10 }}>
                    <FavoriteBorderIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Chưa có sản phẩm yêu thích
                    </Typography>
                    <Button
                        variant="contained"
                        component={RouterLink}
                        to="/products"
                        sx={{ mt: 2 }}
                    >
                        Khám phá sản phẩm
                    </Button>
                </Box>
            )}

            {/* Product grid */}
            {!loading && wishlist && wishlist.products.length > 0 && (
                <Grid container spacing={3}>
                    {wishlist.products.map((product) => (
                        <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'box-shadow 0.2s',
                                    '&:hover': { boxShadow: 4 },
                                }}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    {/* Tên sản phẩm */}
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={600}
                                        gutterBottom
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {product.name}
                                    </Typography>

                                    {/* Trạng thái */}
                                    <Chip
                                        label={product.status === 0 || product.stock === 0 ? 'Hết hàng' : `Còn ${product.stock}`}
                                        color={product.status === 0 || product.stock === 0 ? 'default' : 'success'}
                                        size="small"
                                        sx={{ mb: 1 }}
                                    />

                                    {/* Giá */}
                                    <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mt: 1 }}>
                                        {formatPrice(product.price)}
                                    </Typography>
                                </CardContent>

                                <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                                    {/* Xem chi tiết */}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<VisibilityOutlinedIcon />}
                                        component={RouterLink}
                                        to={`/products/${product.id}`}
                                        sx={{ flex: 1 }}
                                    >
                                        Xem sản phẩm
                                    </Button>

                                    {/* Xóa khỏi wishlist */}
                                    <IconButton
                                        color="error"
                                        onClick={() => removeItem(product.id)}
                                        title="Xóa khỏi yêu thích"
                                    >
                                        <DeleteOutlinedIcon />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default WishlistPage;
