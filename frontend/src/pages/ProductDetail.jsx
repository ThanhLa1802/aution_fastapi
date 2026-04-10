import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, Button, Chip, Divider, Rating,
  CircularProgress, Alert, TextField, Avatar, Paper,
  IconButton, Tooltip,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import * as productAPI from '../api/products';
import * as reviewAPI from '../api/reviews';
import * as wishlistAPI from '../api/wishlist';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuthStore();
  const { addItem } = useCartStore();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [inWishlist, setInWishlist] = useState(false);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    Promise.all([
      productAPI.getProduct(id),
      reviewAPI.getReviews(id),
    ])
      .then(([p, r]) => { setProduct(p); setReviews(r); })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));

    if (accessToken) {
      wishlistAPI.getWishlist()
        .then((wl) => setInWishlist(wl.products.some((p) => p.id === Number(id))))
        .catch(() => {});
    }
  }, [id, accessToken]);

  const handleAddToCart = async () => {
    if (!accessToken) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addItem(Number(id), qty);
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = async () => {
    if (!accessToken) { navigate('/login'); return; }
    try {
      if (inWishlist) {
        await wishlistAPI.removeFromWishlist(id);
        setInWishlist(false);
      } else {
        await wishlistAPI.addToWishlist(id);
        setInWishlist(true);
      }
    } catch { /* ignore */ }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewError('');
    try {
      const r = await reviewAPI.createReview(id, { rating: reviewRating, comment: reviewComment });
      setReviews((prev) => [r, ...prev]);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.response?.data?.detail ?? 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch { /* ignore */ }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!product) return null;

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      <Grid container spacing={4}>
        {/* Left: Image */}
        <Grid item xs={12} md={5}>
          <Paper
            variant="outlined"
            sx={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', overflow: 'hidden' }}
          >
            {product.image ? (
              <Box
                component="img"
                src={`/media/${product.image}?v=${product.updated_at ? new Date(product.updated_at).getTime() : 0}`}
                alt={product.name}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Typography color="text.disabled">No Image</Typography>
            )}
          </Paper>
        </Grid>

        {/* Right: Info */}
        <Grid item xs={12} md={7}>
          <Typography variant="h4" fontWeight={700}>{product.name}</Typography>

          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Rating value={avgRating} precision={0.5} readOnly size="small" />
            <Typography variant="body2" color="text.secondary">
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </Typography>
          </Box>

          <Typography variant="h4" sx={{ color: '#EE4D2D' }} fontWeight={700} mt={2}>
            ${Number(product.price).toFixed(2)}
          </Typography>

          <Box mt={1.5}>
            {product.stock === 0 ? (
              <Chip label="Out of Stock" color="error" />
            ) : (
              <Chip label={`${product.stock} in stock`} color="success" />
            )}
          </Box>

          {product.description && (
            <Typography variant="body1" color="text.secondary" mt={3} sx={{ lineHeight: 1.8 }}>
              {product.description}
            </Typography>
          )}

          <Box display="flex" alignItems="center" gap={2} mt={4}>
            <TextField
              label="Qty"
              type="number"
              size="small"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
              inputProps={{ min: 1, max: product.stock }}
              sx={{ width: 80 }}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<ShoppingCartIcon />}
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding}
              sx={{ backgroundImage: 'linear-gradient(to right,#f53d2d,#f63)', '&:hover': { filter: 'brightness(1.08)' }, px: 3 }}
            >
              {adding ? 'Adding…' : 'Add to Cart'}
            </Button>
            <Tooltip title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}>
              <IconButton onClick={handleWishlist} color={inWishlist ? 'error' : 'default'}>
                {inWishlist ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>

      {/* Reviews */}
      <Divider sx={{ my: 5 }} />
      <Typography variant="h5" fontWeight={700} mb={3}>Customer Reviews</Typography>

      {/* Submit review form */}
      {accessToken && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Leave a Review</Typography>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          <Box component="form" onSubmit={handleSubmitReview} display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography>Rating:</Typography>
              <Rating
                value={reviewRating}
                onChange={(_, v) => setReviewRating(v)}
              />
            </Box>
            <TextField
              label="Comment"
              multiline
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={submittingReview}
              sx={{ alignSelf: 'flex-start' }}
            >
              {submittingReview ? 'Submitting…' : 'Submit Review'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <Typography color="text.secondary">No reviews yet. Be the first!</Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {reviews.map((r) => (
            <Paper key={r.id} variant="outlined" sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                  {r.username[0].toUpperCase()}
                </Avatar>
                <Box flexGrow={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontWeight={600}>{r.username}</Typography>
                    <Rating value={r.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary" ml="auto">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </Typography>
                    {user?.id === r.user_id && (
                      <Tooltip title="Delete review">
                        <IconButton size="small" onClick={() => handleDeleteReview(r.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {r.comment}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
