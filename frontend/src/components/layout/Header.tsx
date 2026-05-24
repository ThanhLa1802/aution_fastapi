import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore, selectTotalItems } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

const Header = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const clearAuth = useAuthStore((s) => s.clearAuth);
    // selectTotalItems: selector function → chỉ re-render khi số lượng thay đổi
    const cartCount = useCartStore(selectTotalItems);

    // Menu state — anchorEl: phần tử HTML mà menu "gắn" vào để hiện đúng vị trí
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleLogout = () => {
        clearAuth(); // xóa Zustand state + localStorage refreshToken
        useCartStore.getState().resetCart(); // xóa cart khỏi memory khi logout
        useWishlistStore.getState().resetWishlist(); // xóa wishlist khỏi memory khi logout
        setAnchorEl(null);
        navigate('/login');
    };

    return (
        <AppBar position="sticky" color="primary" elevation={2}>
            <Toolbar sx={{ gap: 1 }}>
                <Typography variant="h6" component={RouterLink} to="/"
                    sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
                    ShopNow
                </Typography>

                <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
                    <Button color="inherit" component={RouterLink} to="/products">Sản phẩm</Button>
                </Box>

                <IconButton color="inherit" component={RouterLink} to="/wishlist">
                    <FavoriteIcon />
                </IconButton>

                <IconButton color="inherit" component={RouterLink} to="/cart">
                    <Badge badgeContent={cartCount} color="secondary">
                        <ShoppingCartIcon />
                    </Badge>
                </IconButton>

                {/* ── Auth: hiện tên user nếu đã login, nếu không hiện nút Đăng nhập ── */}
                {user ? (
                    <>
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                                {user.username[0].toUpperCase()}
                            </Avatar>
                        </IconButton>
                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                            <MenuItem disabled sx={{ opacity: '1 !important' }}>
                                <Typography variant="body2" fontWeight={600}>{user.username}</Typography>
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/orders" onClick={() => setAnchorEl(null)}>
                                Đơn hàng của tôi
                            </MenuItem>
                            {user.is_staff && (
                                <>
                                    <MenuItem
                                        component={RouterLink}
                                        to="/admin/products"
                                        onClick={() => setAnchorEl(null)}
                                        sx={{ color: 'warning.dark' }}
                                    >
                                        <AdminPanelSettingsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                                        Admin: Sản phẩm
                                    </MenuItem>
                                    <MenuItem
                                        component={RouterLink}
                                        to="/admin/orders"
                                        onClick={() => setAnchorEl(null)}
                                        sx={{ color: 'warning.dark' }}
                                    >
                                        <AdminPanelSettingsOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                                        Admin: Đơn hàng
                                    </MenuItem>
                                </>
                            )}
                            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                Đăng xuất
                            </MenuItem>
                        </Menu>
                    </>
                ) : (
                    <Button color="inherit" component={RouterLink} to="/login" variant="outlined"
                        sx={{ borderColor: 'rgba(255,255,255,0.5)', ml: 1 }}>
                        Đăng nhập
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Header;