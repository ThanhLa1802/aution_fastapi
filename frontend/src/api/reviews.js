import { fastapiClient } from './client';

export const getReviews = (productId, params) =>
  fastapiClient.get(`/products/${productId}/reviews`, { params }).then((r) => r.data);

export const createReview = (productId, data) =>
  fastapiClient.post(`/products/${productId}/reviews`, data).then((r) => r.data);

export const deleteReview = (reviewId) =>
  fastapiClient.delete(`/reviews/${reviewId}`);
