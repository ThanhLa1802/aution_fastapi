import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import BoltIcon from '@mui/icons-material/Bolt';
import StarIcon from '@mui/icons-material/Star';
import { Link as RouterLink } from 'react-router-dom';

// ─── Feature Card ─────────────────────────────────────────────────────────────
// This is a presentational (dumb) component — it only receives props, no state.
// Concept: props typing với TypeScript interface
interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
    <Card elevation={0} sx={{ textAlign: 'center', p: 2, bgcolor: 'background.paper', borderRadius: 3 }}>
        <CardContent>
            <Box sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}>{icon}</Box>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
        </CardContent>
    </Card>
);

// ─── Home Page ───────────────────────────────────────────────────────────────
//
// Phase 1: static hero + feature cards.
// Phase 2: thay "Xem sản phẩm" → tải danh sách thực từ API.
//
const HomePage = () => {
    return (
        <Box>
            {/* ── Hero Section ─────────────────────────────── */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                    color: 'white',
                    py: { xs: 8, md: 14 },
                    textAlign: 'center',
                }}
            >
                <Container maxWidth="md">
                    <Typography variant="h3" fontWeight={700} gutterBottom>
                        Mua sắm thông minh, nhanh chóng
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.85, mb: 4 }}>
                        Hàng ngàn sản phẩm · Giao hàng nhanh · Bảo hành uy tín
                    </Typography>
                    <Button
                        component={RouterLink}
                        to="/products"
                        variant="contained"
                        color="secondary"
                        size="large"
                        sx={{ px: 4, py: 1.5, fontSize: 16 }}
                    >
                        Khám phá sản phẩm
                    </Button>
                </Container>
            </Box>

            {/* ── Feature Cards ─────────────────────────────── */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Typography variant="h4" fontWeight={600} textAlign="center" mb={5}>
                    Tại sao chọn ShopNow?
                </Typography>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FeatureCard
                            icon={<ShoppingBagIcon fontSize="inherit" />}
                            title="Hàng ngàn sản phẩm"
                            description="Tất cả danh mục — điện tử, thời trang, gia dụng và hơn thế nữa."
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FeatureCard
                            icon={<BoltIcon fontSize="inherit" />}
                            title="Flash Sale mỗi ngày"
                            description="Giảm giá sốc đến 70%, tính theo giây nhờ Redis stock gate."
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FeatureCard
                            icon={<StarIcon fontSize="inherit" />}
                            title="Đánh giá tin cậy"
                            description="Review có kiểm chứng từ người dùng đã mua hàng thực tế."
                        />
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default HomePage;
