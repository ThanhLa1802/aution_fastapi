import axios from 'axios';

// Two separate clients: one for Django auth, one for FastAPI data
export const djangoClient = axios.create({ baseURL: '/api/auth' });
export const fastapiClient = axios.create({ baseURL: '/api/v1' });

// Lazy import to avoid circular dependency at module load time
const getAuthStore = () => import('../store/authStore').then((m) => m.default);

// Attach access token on every request
const attachToken = async (config) => {
  const store = await getAuthStore();
  const token = store.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

djangoClient.interceptors.request.use(attachToken);
fastapiClient.interceptors.request.use(attachToken);

// Auto-refresh on 401 (FastAPI only) — prevents concurrent refreshes via a shared queue
let isRefreshing = false;
let failedQueue = [];

const drainQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  failedQueue = [];
};

fastapiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status !== 401 || orig._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => failedQueue.push({ resolve, reject })).then(
        (token) => {
          orig.headers.Authorization = `Bearer ${token}`;
          return fastapiClient(orig);
        },
      );
    }

    orig._retry = true;
    isRefreshing = true;

    const store = await getAuthStore();
    const refreshToken = store.getState().refreshToken;

    if (!refreshToken) {
      store.getState().logout();
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const res = await axios.post('/api/auth/token/refresh/', { refresh: refreshToken });
      const newToken = res.data.access;
      store.getState().setAccessToken(newToken);
      drainQueue(null, newToken);
      orig.headers.Authorization = `Bearer ${newToken}`;
      return fastapiClient(orig);
    } catch (refreshError) {
      drainQueue(refreshError);
      store.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
