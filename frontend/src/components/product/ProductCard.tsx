// src/components/product/ProductCard.tsx
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import type { Product } from '../../types';

// ─── Concept: Props Interface ─────────────────────────────────────────────────
// ProductCard nhận Product làm prop → "dumb component" (không có state, không gọi API)
// Chỉ render dữ liệu — dễ test, dễ tái sử dụng
interface ProductCardProps {
    product: Product;
}

// Định dạng giá tiền kiểu Việt Nam: 1500000 → "1.500.000 ₫"
const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const ProductCard = ({ product }: ProductCardProps) => {
    const outOfStock = product.status === 0 || product.stock === 0;

    return (
        <Card
            elevation={1}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: outOfStock ? 0.6 : 1,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 6 },
            }}
        >
            {/* CardActionArea: toàn bộ card có thể click → navigate đến detail */}
            <CardActionArea component={RouterLink} to={`/products/${product.id}`} sx={{ flexGrow: 1 }}>
                <CardMedia
                    component="img"
                    height="180"
                    image={product.image || `https://placehold.co/400x300?text=${encodeURIComponent(product.name)}`}
                    alt={product.name}
                    sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {product.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{
                        mt: 0.5, mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {product.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="h6" color="primary.main" fontWeight={700}>
                            {formatPrice(product.price)}
                        </Typography>
                        {outOfStock && <Chip label="Hết hàng" size="small" color="default" />}
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

export default ProductCard;