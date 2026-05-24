import Box from '@mui/material/Box';
import Header from './Header';
import Footer from './Footer';

// ─── Layout Component ─────────────────────────────────────────────────────────
//
// Wraps every page with a consistent Header + Footer.
// Usage in App.tsx:
//
//   <Route element={<Layout />}>
//     <Route path="/" element={<HomePage />} />
//     <Route path="/products" element={<ProductsPage />} />
//   </Route>
//
// The <Outlet /> from react-router is what renders child routes.
//
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        // Column flex: makes footer stick to bottom even on short pages
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />

            {/* Main content area — grows to fill available space */}
            <Box component="main" sx={{ flexGrow: 1 }}>
                <Outlet />
            </Box>

            <Footer />
        </Box>
    );
};

export default Layout;
