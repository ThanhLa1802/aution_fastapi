// src/pages/ProductsPage.tsx
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ProductCard from '../components/product/ProductCard';
import { fetchProducts } from '../api/products';
import type { Product } from '../types';

// ─── Concept: useState ────────────────────────────────────────────────────────
// useState<T>(initialValue) → [value, setter]
// Mỗi lần setter được gọi → React re-render component
//
// ─── Concept: useEffect ───────────────────────────────────────────────────────
// useEffect(fn, [deps]) → chạy fn khi component mount hoặc khi deps thay đổi
// deps = [] → chỉ chạy 1 lần khi mount
// deps = [page, search] → chạy lại mỗi khi page hoặc search thay đổi

const LIMIT = 12; // số sản phẩm mỗi trang

const ProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState(''); // input chưa submit
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Gọi API mỗi khi page hoặc search thay đổi ──────────────────────────────
    useEffect(() => {
        let cancelled = false; // cleanup flag: tránh set state khi component đã unmount

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchProducts({
                    limit: LIMIT,
                    offset: (page - 1) * LIMIT,
                    search: search || undefined,
                });
                if (!cancelled) {
                    setProducts(result.items);
                    setTotal(result.total);
                }
            } catch (err) {
                if (!cancelled) setError((err as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; }; // cleanup khi unmount hoặc deps thay đổi
    }, [page, search]);

    const totalPages = Math.ceil(total / LIMIT);

    // ── Submit tìm kiếm (Enter hoặc click) ────────────────────────────────────
    const handleSearch = () => {
        setPage(1);           // reset về trang 1 khi search mới
        setSearch(searchInput);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            {/* Header + Search bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" fontWeight={600}>
                    Sản phẩm {total > 0 && <Typography component="span" variant="h6" color="text.secondary">({total} sản phẩm)</Typography>}
                </Typography>
                <TextField
                    size="small"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    sx={{ width: 280 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            </Box>

            {/* Error state */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Product Grid */}
            <Grid container spacing={3}>
                {loading
                    // ── Loading: hiện skeleton thay vì màn hình trắng ──────────────────
                    ? Array.from({ length: LIMIT }).map((_, i) => (
                        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))
                    // ── Data: render ProductCard ─────────────────────────────────────
                    : products.map((product) => (
                        <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <ProductCard product={product} />
                        </Grid>
                    ))
                }

                {/* Empty state */}
                {!loading && products.length === 0 && !error && (
                    <Grid size={12}>
                        <Typography textAlign="center" color="text.secondary" sx={{ py: 10 }}>
                            Không tìm thấy sản phẩm nào.
                        </Typography>
                    </Grid>
                )}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        size="large"
                    />
                </Box>
            )}
        </Container>
    );
};

export default ProductsPage;