// src/pages/admin/AdminProductsPage.tsx
import { useState, useEffect, useCallback } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import { fetchProducts } from '../../api/products';
import { fetchCategories } from '../../api/products';
import {
    adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminReindex,
    type ProductCreateBody, type ProductUpdateBody,
} from '../../api/admin';
import type { Product, Category } from '../../types';

const formatPrice = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// ─── Product Form Dialog ───────────────────────────────────────────────────────
interface ProductFormProps {
    open: boolean;
    product: Product | null;   // null = create mode, Product = edit mode
    categories: Category[];
    onClose: () => void;
    onSaved: (p: Product) => void;
}

const EMPTY_FORM: ProductCreateBody = {
    name: '', description: '', price: 0, stock: 0, status: 1, category_id: null,
};

const ProductFormDialog = ({ open, product, categories, onClose, onSaved }: ProductFormProps) => {
    const [form, setForm] = useState<ProductCreateBody>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Khi mở dialog, điền dữ liệu sản phẩm nếu đang edit
    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                status: product.status,
                category_id: product.category_id ?? null,
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setError(null);
    }, [product, open]);

    const handleChange = (field: keyof ProductCreateBody) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setForm((f) => ({
                ...f,
                [field]: ['price', 'stock', 'status', 'category_id'].includes(field)
                    ? (val === '' ? null : Number(val))
                    : val,
            }));
        };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            let saved: Product;
            if (product) {
                // Edit mode — chỉ gửi các field đã thay đổi (PATCH)
                const body: ProductUpdateBody = {};
                if (form.name !== product.name) body.name = form.name;
                if (form.description !== product.description) body.description = form.description;
                if (form.price !== product.price) body.price = form.price;
                if (form.stock !== product.stock) body.stock = form.stock;
                if (form.status !== product.status) body.status = form.status as 0 | 1;
                if (form.category_id !== (product.category_id ?? null)) body.category_id = form.category_id;
                saved = await adminUpdateProduct(product.id, body) as unknown as Product;
            } else {
                saved = await adminCreateProduct(form) as unknown as Product;
            }
            onSaved(saved);
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Tên sản phẩm" required fullWidth
                        value={form.name} onChange={handleChange('name')}
                    />
                    <TextField
                        label="Mô tả" multiline rows={3} fullWidth
                        value={form.description} onChange={handleChange('description')}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Giá (VNĐ)" type="number" required sx={{ flex: 1 }}
                            value={form.price} onChange={handleChange('price')}
                            inputProps={{ min: 0 }}
                        />
                        <TextField
                            label="Tồn kho" type="number" sx={{ flex: 1 }}
                            value={form.stock} onChange={handleChange('stock')}
                            inputProps={{ min: 0 }}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            label="Trạng thái" select sx={{ flex: 1 }}
                            value={form.status} onChange={handleChange('status')}
                        >
                            <MenuItem value={1}>Đang bán</MenuItem>
                            <MenuItem value={0}>Ngừng bán</MenuItem>
                        </TextField>
                        <TextField
                            label="Danh mục" select sx={{ flex: 1 }}
                            value={form.category_id ?? ''} onChange={handleChange('category_id')}
                        >
                            <MenuItem value="">-- Không có --</MenuItem>
                            {categories.map((c) => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={saving}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── AdminProductsPage ─────────────────────────────────────────────────────────
const AdminProductsPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Product | null>(null);

    // Snackbar
    const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
        { open: false, message: '', severity: 'success' }
    );
    const showSnack = (message: string, severity: 'success' | 'error' = 'success') =>
        setSnack({ open: true, message, severity });

    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            // Dùng fetchProducts với limit lớn để lấy toàn bộ cho admin
            const data = await fetchProducts({ limit: 100, offset: 0, in_stock: false });
            setProducts(data.items as unknown as Product[]);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
        fetchCategories().then(setCategories).catch(() => { });
    }, [loadProducts]);

    const handleDelete = async (product: Product) => {
        if (!window.confirm(`Xóa sản phẩm "${product.name}"? (xóa mềm, status = 0)`)) return;
        try {
            await adminDeleteProduct(product.id);
            setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: 0 } : p));
            showSnack(`Đã xóa "${product.name}"`);
        } catch (err) {
            showSnack((err as Error).message, 'error');
        }
    };

    const handleReindex = async () => {
        try {
            await adminReindex();
            showSnack('Đã đồng bộ Elasticsearch thành công');
        } catch (err) {
            showSnack((err as Error).message, 'error');
        }
    };

    const handleSaved = (saved: Product) => {
        setProducts((prev) => {
            const exists = prev.find((p) => p.id === saved.id);
            if (exists) return prev.map((p) => p.id === saved.id ? saved : p);
            return [saved, ...prev];
        });
        showSnack(editTarget ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm mới');
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>Quản lý sản phẩm</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Đồng bộ Elasticsearch">
                        <Button variant="outlined" startIcon={<SyncIcon />} onClick={handleReindex}>
                            Reindex
                        </Button>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditTarget(null); setDialogOpen(true); }}
                    >
                        Thêm sản phẩm
                    </Button>
                </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={60} sx={{ mb: 1 }} />)}</Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                                <TableCell>ID</TableCell>
                                <TableCell>Tên sản phẩm</TableCell>
                                <TableCell align="right">Giá</TableCell>
                                <TableCell align="center">Tồn kho</TableCell>
                                <TableCell align="center">Trạng thái</TableCell>
                                <TableCell align="center">Danh mục</TableCell>
                                <TableCell align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((p) => (
                                <TableRow key={p.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">#{p.id}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">{formatPrice(p.price)}</Typography>
                                    </TableCell>
                                    <TableCell align="center">{p.stock}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={p.status === 1 ? 'Đang bán' : 'Ngừng bán'}
                                            color={p.status === 1 ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {categories.find((c) => c.id === p.category_id)?.name ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Chỉnh sửa">
                                            <IconButton
                                                size="small"
                                                onClick={() => { setEditTarget(p); setDialogOpen(true); }}
                                            >
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa (mềm)">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(p)}
                                                disabled={p.status === 0}
                                            >
                                                <DeleteOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Form dialog */}
            <ProductFormDialog
                open={dialogOpen}
                product={editTarget}
                categories={categories}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} variant="filled"
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default AdminProductsPage;
