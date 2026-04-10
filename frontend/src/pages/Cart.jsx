import { useEffect } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Button, IconButton, TextField,
    CircularProgress, Divider, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Cart() {
    const navigate = useNavigate();
    const { cart, loading, fetchCart, updateItem, removeItem, clearCart } = useCartStore();
    const { accessToken } = useAuthStore();

    useEffect(() => {
        if (accessToken) fetchCart();
    }, [accessToken]);

    if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress sx={{ color: '#EE4D2D' }} /></Box>;

    const items = cart?.items ?? [];

    if (items.length === 0) {
        return (
            <Box textAlign="center" py={10}>
                <ShoppingBagIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary" mt={2}>Your cart is empty</Typography>
                <Button variant="contained" sx={{ mt: 3, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', '&:hover': { filter: 'brightness(1.08)' } }} onClick={() => navigate('/')}>
                    Start Shopping
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} mb={3}>Shopping Cart</Typography>

            <Box display="flex" gap={3} flexWrap={{ xs: 'wrap', md: 'nowrap' }}>
                {/* Items table */}
                <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#FFF5F3' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        <Typography
                                            fontWeight={600}
                                            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                                            onClick={() => navigate(`/products/${item.product_id}`)}
                                        >
                                            {item.product_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <TextField
                                            type="number"
                                            size="small"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const q = Math.max(1, Number(e.target.value));
                                                updateItem(item.id, q).catch(() => { });
                                            }}
                                            inputProps={{ min: 1 }}
                                            sx={{ width: 70 }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">${Number(item.product_price).toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        ${Number(item.subtotal).toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => removeItem(item.id).catch(() => { })}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Order summary */}
                <Paper
                    variant="outlined"
                    sx={{ p: 3, minWidth: 260, maxWidth: 300, height: 'fit-content' }}
                >
                    <Typography variant="h6" fontWeight={700} mb={2}>Order Summary</Typography>
                    <Divider sx={{ mb: 2 }} />

                    {items.map((item) => (
                        <Box key={item.id} display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{item.product_name}</Typography>
                            <Typography variant="body2">${Number(item.subtotal).toFixed(2)}</Typography>
                        </Box>
                    ))}

                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" justifyContent="space-between">
                        <Typography fontWeight={700}>Total</Typography>
                        <Typography fontWeight={700} sx={{ color: '#EE4D2D' }} variant="h6">
                            ${Number(cart.total).toFixed(2)}
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ mt: 3, backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', '&:hover': { filter: 'brightness(1.08)' } }}
                        onClick={() => navigate('/checkout')}
                    >
                        Proceed to Checkout
                    </Button>
                    <Button
                        variant="text"
                        color="error"
                        fullWidth
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => clearCart().catch(() => { })}
                    >
                        Clear Cart
                    </Button>
                </Paper>
            </Box>
        </Box>
    );
}
