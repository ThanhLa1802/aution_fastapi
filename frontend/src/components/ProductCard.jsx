import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function ProductCard({ product, inWishlist = false, onWishlistToggle }) {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const { addItem } = useCartStore();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!accessToken) { navigate('/login'); return; }
    setAdding(true);
    try { await addItem(product.id, 1); }
    catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    if (!accessToken) { navigate('/login'); return; }
    onWishlistToggle?.(product.id);
  };

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: '2px',
        overflow: 'hidden',
        boxShadow: 'rgba(0,0,0,0.06) 0px 1px 4px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 'rgba(0,0,0,0.18) 0px 4px 16px',
        },
        /* hover shows the add-to-cart overlay */
        '&:hover .sfp-add-overlay': {
          opacity: 1,
          transform: 'translateY(0)',
        },
      }}
    >
      {/* Image area */}
      <Box
        sx={{ position: 'relative', paddingTop: '100%', bgcolor: 'grey.100', flexShrink: 0 }}
        onClick={() => navigate(`/products/${product.id}`)}
      >
        {/* Image / placeholder */}
        <Box
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {product.image ? (
            <Box
              component="img"
              src={`/media/${product.image}?v=${product.updated_at ? new Date(product.updated_at).getTime() : 0}`}
              alt={product.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <Typography color="text.disabled" variant="caption" fontSize={11}>No Image</Typography>
          )}
        </Box>

        {/* Wishlist heart */}
        <Tooltip title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
          <IconButton
            size="small"
            onClick={handleWishlist}
            sx={{
              position: 'absolute', top: 4, right: 4,
              bgcolor: 'rgba(255,255,255,0.85)',
              '&:hover': { bgcolor: 'white' },
              width: 28, height: 28,
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {inWishlist
              ? <FavoriteIcon sx={{ fontSize: 16, color: '#EE4D2D' }} />
              : <FavoriteBorderIcon sx={{ fontSize: 16, color: '#757575' }} />}
          </IconButton>
        </Tooltip>

        {/* Out-of-stock overlay */}
        {product.stock === 0 && (
          <Box
            sx={{
              position: 'absolute', inset: 0,
              bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '2px 2px 0 0',
            }}
          >
            <Typography
              sx={{
                color: 'white', fontWeight: 700, fontSize: 11, letterSpacing: 1,
                textTransform: 'uppercase', bgcolor: 'rgba(0,0,0,0.5)',
                px: 1.5, py: 0.5, borderRadius: '2px',
              }}
            >
              Sold Out
            </Typography>
          </Box>
        )}

        {/* Add to cart hover overlay */}
        {product.stock > 0 && (
          <Box
            className="sfp-add-overlay"
            onClick={handleAddToCart}
            sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              bgcolor: 'rgba(238,77,45,0.92)',
              color: 'white',
              py: 0.75,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.3,
              opacity: 0,
              transform: 'translateY(100%)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              userSelect: 'none',
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 14 }} />
            {adding ? 'Adding...' : 'Add to Cart'}
          </Box>
        )}
      </Box>

      {/* Info area */}
      <Box
        sx={{ p: 1.25, flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        onClick={() => navigate(`/products/${product.id}`)}
      >
        {/* Name: 2 lines max */}
        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 0.75,
            flexGrow: 1,
            color: 'text.primary',
          }}
          title={product.name}
        >
          {product.name}
        </Typography>

        {/* Price */}
        <Typography
          sx={{ color: '#EE4D2D', fontWeight: 700, fontSize: 15, lineHeight: 1 }}
        >
          ${Number(product.price).toFixed(2)}
        </Typography>

        {/* Stock */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontSize: 11, mt: 0.5, display: 'block' }}
        >
          {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
        </Typography>
      </Box>
    </Box>
  );
}
