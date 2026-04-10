import { djangoClient } from './client';

export const login = (username, password) =>
  djangoClient.post('/login/', { username, password }).then((r) => r.data);

export const register = (data) =>
  djangoClient.post('/register/', data).then((r) => r.data);

export const refreshAccessToken = (refresh) =>
  djangoClient.post('/token/refresh/', { refresh }).then((r) => r.data);

export const getMe = () =>
  djangoClient.get('/me/').then((r) => r.data);
