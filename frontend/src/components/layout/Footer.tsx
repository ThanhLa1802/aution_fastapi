import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import { Link as RouterLink } from 'react-router-dom';

// ─── Footer Component ─────────────────────────────────────────────────────────
//
// Concepts:
//   • MUI Box with sx prop: inline styles using the theme system
//   • MUI Grid: responsive column layout
//   • sx={{ mt: 'auto' }} on Layout will push Footer to bottom of page
//
const Footer = () => {
    return (
        <Box
            component="footer"
            sx={{
                bgcolor: 'primary.dark',
                color: 'white',
                py: 4,
                mt: 'auto', // pushes footer to bottom when using flexbox layout
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4}>
                    {/* ── Brand ──────────────────────────────────── */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            ShopNow
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            Nền tảng mua sắm trực tuyến — xây dựng với React + FastAPI
                        </Typography>
                    </Grid>

                    {/* ── Quick Links ────────────────────────────── */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                            Liên kết
                        </Typography>
                        {[
                            { label: 'Sản phẩm', to: '/products' },
                            { label: 'Giỏ hàng', to: '/cart' },
                            { label: 'Đơn hàng', to: '/orders' },
                        ].map((link) => (
                            <Box key={link.to}>
                                <Link
                                    component={RouterLink}
                                    to={link.to}
                                    color="inherit"
                                    underline="hover"
                                    sx={{ opacity: 0.8 }}
                                >
                                    {link.label}
                                </Link>
                            </Box>
                        ))}
                    </Grid>

                    {/* ── Tech Stack ─────────────────────────────── */}
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                            Tech Stack
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7, lineHeight: 2 }}>
                            React 18 + TypeScript
                            <br />
                            Material UI v5
                            <br />
                            Zustand · Axios · React Router v6
                        </Typography>
                    </Grid>
                </Grid>

                {/* ── Copyright ────────────────────────────────── */}
                <Typography variant="body2" sx={{ mt: 3, opacity: 0.5, textAlign: 'center' }}>
                    © {new Date().getFullYear()} ShopNow. Học ReactJS bằng cách build dự án thực tế.
                </Typography>
            </Container>
        </Box>
    );
};

export default Footer;
