import { createTheme } from '@mui/material/styles';

// Custom MUI theme for the e-commerce platform
// Docs: https://mui.com/material-ui/customization/theming/
const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // blue
        },
        secondary: {
            main: '#f50057', // pink-red — used for sale badges, cart buttons
        },
        background: {
            default: '#f5f5f5',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 600,
        },
    },
    components: {
        // Make all buttons slightly rounded by default
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none', // Disable ALL-CAPS default
                },
            },
        },
    },
});

export default theme;
