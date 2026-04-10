import { fastapiClient } from './client';

export const getWishlist = () =>
  fastapiClient.get('/wishlist').then((r) => r.data);

export const addToWishlist = (productId) =>
  fastapiClient.post(`/wishlist/${productId}`).then((r) => r.data);

export const removeFromWishlist = (productId) =>
  fastapiClient.delete(`/wishlist/${productId}`).then((r) => r.data);
