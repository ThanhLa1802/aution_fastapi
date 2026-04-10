import {
  Box, Typography, IconButton, Badge, Avatar, Tooltip,
  InputBase, Button, Divider,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { SHOPEE_GRADIENT } from '../theme';

const INNER_SX = { maxWidth: 1280, mx: 'auto', px: { xs: 1.5, md: 3 } };

export default function Navbar() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useAuthStore();
  const { cart, reset } = useCartStore();
  const [searchQ, setSearchQ] = useState('');

  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const handleLogout = () => { logout(); reset(); navigate('/login'); };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchQ.trim())}`);
  };

  return (
    <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 1100 }}>
      {/* ── Top micro-bar ───────────────────────────────── */}
      <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)', backgroundImage: SHOPEE_GRADIENT }}>
        <Box sx={{ ...INNER_SX, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, py: '3px' }}>
          {accessToken ? (
            <>
              <NavLink onClick={() => navigate('/orders')} icon={<ReceiptLongIcon sx={{ fontSize: 14 }} />}>
                My Orders
              </NavLink>
              <MicroDivider />
              <NavLink onClick={() => navigate('/profile')} icon={
                <Avatar sx={{ width: 18, height: 18, bgcolor: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                  {user?.username?.[0]?.toUpperCase() ?? 'U'}
                </Avatar>
              }>
                {user?.username ?? 'Account'}
              </NavLink>
              <MicroDivider />
              <NavLink onClick={handleLogout}>Logout</NavLink>
            </>
          ) : (
            <>
              <NavLink onClick={() => navigate('/register')}>Sign Up</NavLink>
              <MicroDivider />
              <NavLink onClick={() => navigate('/login')}>Login</NavLink>
            </>
          )}
        </Box>
      </Box>

      {/* ── Main bar ────────────────────────────────────── */}
      <Box sx={{ backgroundImage: SHOPEE_GRADIENT, py: { xs: 1.25, md: 1.5 }, boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
        <Box sx={{ ...INNER_SX, display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 3 } }}>

          {/* Logo */}
          <Typography
            onClick={() => navigate('/')}
            sx={{
              color: 'white',
              fontWeight: 800,
              fontSize: { xs: 20, md: 26 },
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              userSelect: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            ShopFast
          </Typography>

          {/* Search bar */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              flexGrow: 1,
              display: 'flex',
              bgcolor: 'white',
              borderRadius: '2px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <InputBase
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search products…"
              sx={{
                flex: 1,
                px: 1.5,
                py: 0.6,
                fontSize: 14,
                '& input': { py: 0 },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disableElevation
              sx={{
                borderRadius: 0,
                px: { xs: 1.5, md: 2.5 },
                minWidth: 0,
                bgcolor: '#fb5533',
                '&:hover': { bgcolor: '#e0451d' },
              }}
            >
              <SearchIcon sx={{ fontSize: 20 }} />
            </Button>
          </Box>

          {/* Right icons */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Wishlist">
              <IconButton
                onClick={() => navigate('/wishlist')}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                <FavoriteIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Cart">
              <IconButton
                onClick={() => navigate('/cart')}
                sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                <Badge
                  badgeContent={cartCount}
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: 'white',
                      color: '#EE4D2D',
                      fontWeight: 700,
                      fontSize: 11,
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {accessToken && (
              <Tooltip title="Profile">
                <IconButton
                  onClick={() => navigate('/profile')}
                  sx={{ ml: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      border: '1.5px solid rgba(255,255,255,0.7)',
                      fontSize: 13,
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    {user?.username?.[0]?.toUpperCase() ?? <PersonOutlineIcon fontSize="small" />}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Helpers ──────────────────────────────────────────
function NavLink({ children, onClick, icon }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: '3px',
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        cursor: 'pointer',
        px: 0.5, py: '2px',
        borderRadius: 1,
        '&:hover': { color: 'white', textDecoration: 'underline' },
      }}
    >
      {icon}
      {children}
    </Box>
  );
}

function MicroDivider() {
  return (
    <Divider
      orientation="vertical"
      flexItem
      sx={{ bgcolor: 'rgba(255,255,255,0.35)', my: '3px' }}
    />
  );
}
