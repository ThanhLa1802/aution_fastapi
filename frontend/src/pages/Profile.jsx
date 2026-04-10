import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert,
  Avatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import * as authAPI from '../api/auth';
import useAuthStore from '../store/authStore';

const InfoRow = ({ icon, label, value }) => (
  <Box display="flex" alignItems="center" gap={2} py={1.5}>
    <Box color="text.secondary">{icon}</Box>
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography fontWeight={500}>{value ?? '—'}</Typography>
    </Box>
  </Box>
);

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) return;
    authAPI.getMe()
      .then(setUser)
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!user) return null;

  return (
    <Box display="flex" justifyContent="center">
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 480 }}>
        {/* Avatar */}
        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 36, mb: 2 }}>
            {user.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h5" fontWeight={700}>{user.username}</Typography>
          {user.is_verified && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              <VerifiedIcon color="success" fontSize="small" />
              <Typography variant="caption" color="success.main">Verified</Typography>
            </Box>
          )}
        </Box>

        <InfoRow icon={<PersonIcon />} label="Username" value={user.username} />
        <InfoRow icon={<EmailIcon />} label="Email" value={user.email} />
        <InfoRow icon={<PhoneIcon />} label="Phone" value={user.phone} />

        {user.is_staff && (
          <Box
            mt={2}
            px={2}
            py={1}
            bgcolor="warning.light"
            borderRadius={2}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Typography variant="body2" fontWeight={600}>Admin account</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
