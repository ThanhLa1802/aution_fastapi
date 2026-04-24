import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, CircularProgress, FormControl,
    Select, MenuItem, FormControlLabel, Switch, Pagination,
    Alert, Slider, Paper, InputLabel, Chip, Divider,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CategoryIcon from '@mui/icons-material/Category';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TuneIcon from '@mui/icons-material/Tune';
import { useSearchParams } from 'react-router-dom';
import * as productAPI from '../api/products';
import * as wishlistAPI from '../api/wishlist';
import ProductCard from '../components/ProductCard';
import useAuthStore from '../store/authStore';
import { SHOPEE_GRADIENT } from '../theme';

const LIMIT = 20;

// ── Hero banners ─────────────────────────────────────────────────────
const BANNERS = [
    {
        gradient: 'linear-gradient(135deg, #f53d2d 0%, #f6752d 100%)',
        title: 'Mega Sale',
        sub: 'Up to 70% off selected items',
        icon: '🎉',
    },
    {
        gradient: 'linear-gradient(135deg, #c0392b 0%, #e84393 100%)',
        title: 'New Arrivals',
        sub: 'Fresh products added daily',
        icon: '✨',
    },
    {
        gradient: 'linear-gradient(135deg, #1565c0 0%, #0097a7 100%)',
        title: 'Free Shipping',
        sub: 'On orders over $30',
        icon: '🚚',
    },
];

// ── Category icon mapping ─────────────────────────────────────────────
const CAT_ICON_MAP = {
    // Electronics & tech
    phone: '📱', mobile: '📱', smartphone: '📱', electronics: '📱', tech: '💻', computer: '💻', laptop: '💻', tablet: '📱',
    // Fashion & clothing
    fashion: '👗', clothing: '👗', apparel: '👗', shirt: '👔', shoes: '👟', dress: '👗', wear: '👗',
    // Home & living
    home: '🏠', furniture: '🛋️', kitchen: '🍳', living: '🏠', decor: '🏡', household: '🏠',
    // Gaming
    gaming: '🎮', game: '🎮', console: '🎮', toys: '🧸',
    // Books & education
    book: '📚', books: '📚', education: '📚', stationery: '✏️',
    // Camera & photography
    camera: '📷', photo: '📷', photography: '📷',
    // Beauty & health
    beauty: '💄', cosmetic: '💄', makeup: '💄', health: '💊', skincare: '🧴', personal: '🧴',
    // Sports
    sport: '⚽', sports: '⚽', fitness: '🏋️', outdoor: '🏕️', exercise: '🏋️',
    // Food & grocery
    food: '🛒', grocery: '🛒', fresh: '🥦', vegetable: '🥦',
    // Tools & hardware
    tool: '🔧', hardware: '🔧', automotive: '🚗', car: '🚗',
    // Jewellery & accessories
    jewel: '💍', accessory: '💍', accessories: '💍', watch: '⌚', bag: '👜',
    // Pets
    pet: '🐾', animal: '🐾',
    // Baby & kids
    baby: '🍼', kids: '🧒', children: '🧒',
    // Audio & music
    audio: '🎵', music: '🎵', headphone: '🎧',
};
const FALLBACK_ICONS = ['🛒', '🏷️', '📦', '⭐', '🔖', '🎁'];
const getCategoryIcon = (name) => {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(CAT_ICON_MAP)) {
        if (lower.includes(key)) return icon;
    }
    // Hash category name for a consistent fallback icon
    const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return FALLBACK_ICONS[hash % FALLBACK_ICONS.length];
};

export default function Home() {
    const { accessToken } = useAuthStore();
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('q') ?? '';

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [categoryId, setCategoryId] = useState('');
    const [priceRange, setPriceRange] = useState([0, 5000]);
    const [inStock, setInStock] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Banner auto-scroll
    const [bannerIdx, setBannerIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setBannerIdx((i) => (i + 1) % BANNERS.length), 4000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        productAPI.getCategories().then(setCategories).catch(() => { });
    }, []);

    // Reset to page 1 whenever the search query changes
    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    useEffect(() => {
        if (!accessToken) { setWishlistIds(new Set()); return; }
        wishlistAPI.getWishlist()
            .then((wl) => setWishlistIds(new Set(wl.products.map((p) => p.id))))
            .catch(() => { });
    }, [accessToken]);

    useEffect(() => {
        setLoading(true);
        setError('');
        const params = {
            limit: LIMIT,
            offset: (page - 1) * LIMIT,
            ...(categoryId && { category_id: Number(categoryId) }),
            ...(inStock && { in_stock: true }),
            ...(priceRange[0] > 0 && { min_price: priceRange[0] }),
            ...(priceRange[1] < 5000 && { max_price: priceRange[1] }),
            ...(searchQuery && { search: searchQuery }),
        };
        productAPI.getProducts(params)
            .then((data) => {
                const items = Array.isArray(data) ? data : (data.items ?? []);
                setProducts(items);
                const total = Array.isArray(data) ? items.length : (data.total ?? items.length);
                setTotalPages(Math.max(1, Math.ceil(total / LIMIT)));
            })
            .catch(() => setError('Failed to load products.'))
            .finally(() => setLoading(false));
    }, [categoryId, priceRange, inStock, page, searchQuery]);

    const handleWishlistToggle = async (productId) => {
        try {
            if (wishlistIds.has(productId)) {
                await wishlistAPI.removeFromWishlist(productId);
                setWishlistIds((prev) => { const s = new Set(prev); s.delete(productId); return s; });
            } else {
                await wishlistAPI.addToWishlist(productId);
                setWishlistIds((prev) => new Set([...prev, productId]));
            }
        } catch { /* ignore */ }
    };

    const banner = BANNERS[bannerIdx];

    return (
        <Box>
            {/* ── Hero Banner ──────────────────────────────── */}
            <Box
                sx={{
                    backgroundImage: banner.gradient,
                    borderRadius: '2px',
                    mb: 2,
                    p: { xs: 3, md: 5 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: { xs: 120, md: 160 },
                    transition: 'background-image 0.5s',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={800} color="white" sx={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)', fontSize: { xs: 22, md: 34 } }}>
                        {banner.title}
                    </Typography>
                    <Typography color="rgba(255,255,255,0.9)" mt={0.5} fontSize={{ xs: 14, md: 16 }}>
                        {banner.sub}
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: { xs: 56, md: 80 }, lineHeight: 1, userSelect: 'none' }}>
                    {banner.icon}
                </Typography>

                {/* Dots */}
                <Box sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.75 }}>
                    {BANNERS.map((_, i) => (
                        <Box
                            key={i}
                            onClick={() => setBannerIdx(i)}
                            sx={{
                                width: i === bannerIdx ? 20 : 8,
                                height: 8,
                                borderRadius: '4px',
                                bgcolor: i === bannerIdx ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                transition: 'width 0.3s, background-color 0.3s',
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* ── Category pills ───────────────────────────── */}
            {categories.length > 0 && (
                <Paper variant="outlined" sx={{ mb: 2, p: 1.5, borderRadius: '2px' }}>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <CategoryIcon sx={{ color: '#EE4D2D', fontSize: 18 }} />
                        <Chip
                            label="All"
                            size="small"
                            onClick={() => { setCategoryId(''); setPage(1); }}
                            sx={{
                                bgcolor: categoryId === '' ? '#EE4D2D' : 'transparent',
                                color: categoryId === '' ? 'white' : 'text.primary',
                                border: '1px solid',
                                borderColor: categoryId === '' ? '#EE4D2D' : 'divider',
                                fontWeight: 600,
                                fontSize: 12,
                            }}
                        />
                        {categories.map((c) => (
                            <Chip
                                key={c.id}
                                label={`${getCategoryIcon(c.name)} ${c.name}`}
                                size="small"
                                onClick={() => { setCategoryId(c.id); setPage(1); }}
                                sx={{
                                    bgcolor: categoryId === c.id ? '#EE4D2D' : 'transparent',
                                    color: categoryId === c.id ? 'white' : 'text.primary',
                                    border: '1px solid',
                                    borderColor: categoryId === c.id ? '#EE4D2D' : 'divider',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: '#EE4D2D', color: '#EE4D2D' },
                                }}
                            />
                        ))}
                    </Box>
                </Paper>
            )}

            {/* ── Filter bar ───────────────────────────────── */}
            <Paper
                variant="outlined"
                sx={{
                    mb: 2, px: 2, py: 1.25, borderRadius: '2px',
                    display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center',
                }}
            >
                <Box display="flex" alignItems="center" gap={0.75}>
                    <TuneIcon sx={{ fontSize: 16, color: '#EE4D2D' }} />
                    <Typography variant="body2" fontWeight={600} color="text.secondary">Filters</Typography>
                </Box>

                <Box sx={{ width: 200 }}>
                    <Typography variant="caption" color="text.secondary">
                        Price: ${priceRange[0]} – {priceRange[1] >= 5000 ? '$5000+' : `$${priceRange[1]}`}
                    </Typography>
                    <Slider
                        value={priceRange}
                        onChange={(_, val) => { setPriceRange(val); setPage(1); }}
                        min={0} max={5000} step={50}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(v) => `$${v}`}
                        sx={{
                            color: '#EE4D2D',
                            '& .MuiSlider-thumb': { width: 14, height: 14 },
                            py: '6px',
                        }}
                    />
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={inStock}
                            onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
                            size="small"
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#EE4D2D' },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#EE4D2D' },
                            }}
                        />
                    }
                    label={<Typography variant="body2">In Stock Only</Typography>}
                />

                {(categoryId || priceRange[0] > 0 || priceRange[1] < 5000 || inStock || searchQuery) && (
                    <Typography
                        variant="body2"
                        sx={{ color: '#EE4D2D', cursor: 'pointer', fontWeight: 600, ml: 'auto', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => { setCategoryId(''); setPriceRange([0, 5000]); setInStock(false); setPage(1); }}
                    >
                        Clear Filters
                    </Typography>
                )}
            </Paper>

            {/* ── Section header ───────────────────────────── */}
            <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Box sx={{ width: 4, height: 20, bgcolor: '#EE4D2D', borderRadius: '2px', flexShrink: 0 }} />
                <Typography variant="subtitle1" fontWeight={700} color="#EE4D2D">
                    {searchQuery ? `Results for "${searchQuery}"` : 'All Products'}
                </Typography>
                {products.length > 0 && (
                    <Typography variant="body2" color="text.disabled" ml={1}>
                        ({products.length} items)
                    </Typography>
                )}
            </Box>

            {/* ── Results ──────────────────────────────────── */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}>
                    <CircularProgress sx={{ color: '#EE4D2D' }} />
                </Box>
            ) : products.length === 0 ? (
                <Box
                    sx={{
                        textAlign: 'center', py: 10, bgcolor: 'white',
                        borderRadius: '2px', border: '1px solid', borderColor: 'divider',
                    }}
                >
                    <StorefrontIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary" variant="h6">No products found</Typography>
                    <Typography color="text.disabled" variant="body2" mt={0.5}>Try adjusting your filters</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                        },
                        gap: '16px',
                        alignItems: 'stretch',
                    }}
                >
                    {products.map((p) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            inWishlist={wishlistIds.has(p.id)}
                            onWishlistToggle={handleWishlistToggle}
                        />
                    ))}
                </Box>
            )}

            {/* ── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={5}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        sx={{
                            '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#EE4D2D', color: 'white', '&:hover': { bgcolor: '#D73211' } },
                        }}
                        size="large"
                    />
                </Box>
            )}
        </Box>
    );
}
