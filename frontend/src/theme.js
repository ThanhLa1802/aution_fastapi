import { createTheme } from '@mui/material';

// Shopee colour palette
export const SHOPEE_ORANGE = '#EE4D2D';
export const SHOPEE_ORANGE_DARK = '#D73211';
export const SHOPEE_GRADIENT = 'linear-gradient(to right, #f53d2d, #f63)';

const theme = createTheme({
  palette: {
    primary: { main: SHOPEE_ORANGE, dark: SHOPEE_ORANGE_DARK, contrastText: '#fff' },
    secondary: { main: '#f63', contrastText: '#fff' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
    text: { primary: '#333', secondary: '#757575' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 2 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 2, textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: SHOPEE_GRADIENT,
          '&:hover': { background: SHOPEE_GRADIENT, filter: 'brightness(1.08)' },
        },
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 2, boxShadow: 'rgba(0,0,0,0.06) 0px 1px 4px' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 2 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 2 } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 2 } } },
  },
});

export default theme;
