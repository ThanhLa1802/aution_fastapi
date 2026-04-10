import { useState, useEffect } from 'react';
import {
    Box, Grid, Typography, Card, CardContent, CardActions,
    CardActionArea, Button, Chip, CircularProgress, Alert, IconButton,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate } from 'react-router-dom';
import * as wishlistAPI from '../api/wishlist';
import useCartStore from '../store/cartStore';

export default function Wishlist() {
    const navigate = useNavigate();
    const { addItem } = useCartStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        wishlistAPI.getWishlist()
            .then((wl) => setProducts(wl.products))
            .catch(() => setError('Failed to load wishlist.'))
            .finally(() => setLoading(false));
    }, []);

    const handleRemove = async (productId) => {
        try {
            const wl = await wishlistAPI.removeFromWishlist(productId);
            setProducts(wl.products);
        } catch { /* ignore */ }
    };

    const handleAddToCart = async (productId) => {
        try {
            await addItem(productId, 1);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={3}>My Wishlist</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {products.length === 0 ? (
                <Box textAlign="center" py={10}>
                    <FavoriteIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                    <Typography variant="h6" color="text.secondary" mt={2}>Your wishlist is empty</Typography>
                    <Button variant="contained" sx={{ mt: 3, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)' }} onClick={() => navigate('/')}>
                        Browse Products
                    </Button>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {products.map((p) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardActionArea onClick={() => navigate(`/products/${p.id}`)} sx={{ flexGrow: 1 }}>
                                    <Box
                                        sx={{
                                            height: 160,
                                            bgcolor: 'grey.100',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {p.image ? (
                                            <Box
                                                component="img"
                                                src={`/media/${p.image}?v=${Date.now()}`}
                                                alt={p.name}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <Typography color="text.disabled" variant="body2">No Image</Typography>
                                        )}
                                    </Box>
                                    <CardContent>
                                        <Typography fontWeight={600} noWrap>{p.name}</Typography>
                                        <Typography color="primary.main" fontWeight={700} mt={0.5}>
                                            ${Number(p.price).toFixed(2)}
                                        </Typography>
                                        <Box mt={1}>
                                            {p.stock === 0 ? (
                                                <Chip label="Out of Stock" size="small" color="error" />
                                            ) : (
                                                <Chip label={`${p.stock} in stock`} size="small" color="success" />
                                            )}
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<ShoppingCartIcon />}
                                        disabled={p.stock === 0}
                                        onClick={() => handleAddToCart(p.id)}
                                    >
                                        Add to Cart
                                    </Button>
                                    <IconButton size="small" color="error" onClick={() => handleRemove(p.id)}>
                                        <FavoriteIcon />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}
