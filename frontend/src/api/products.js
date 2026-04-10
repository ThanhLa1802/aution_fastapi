import { fastapiClient } from './client';

export const getProducts = (params) =>
  fastapiClient.get('/products', { params }).then((r) => r.data);

export const getProduct = (id) =>
  fastapiClient.get(`/products/${id}`).then((r) => r.data);

export const getCategories = () =>
  fastapiClient.get('/products/categories').then((r) => r.data);
