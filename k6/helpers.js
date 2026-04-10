/**
 * Shared helpers for all K6 test scripts.
 * Import with:  import { login, authHeaders, BASE, randomItem } from './helpers.js';
 */
import http from 'k6/http';
import { check } from 'k6';

export const BASE = {
    django: 'http://localhost:3000/api/auth',   // via nginx → Django :8000
    api: 'http://localhost:3000/api/v1',      // via nginx → FastAPI :8001
};

// ----- Auth ----------------------------------------------------------------

/**
 * Register + login a throw-away user, return JWT access token.
 * Uses a unique suffix so parallel VUs don't collide on username.
 */
export function register(suffix) {
    const payload = JSON.stringify({
        username: `k6user_${suffix}`,
        email: `k6user_${suffix}@test.com`,
        password: 'TestPass123!',
    });
    const res = http.post(`${BASE.django}/register/`, payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    check(res, { 'register 201': (r) => r.status === 201 });
    return res.json('access') || null;
}

/**
 * Login an existing user, return JWT access token.
 */
export function login(username = 'admin', password = 'admin') {
    const res = http.post(
        `${BASE.django}/login/`,
        JSON.stringify({ username, password }),
        { headers: { 'Content-Type': 'application/json' } },
    );
    check(res, { 'login 200': (r) => r.status === 200 });
    return res.json('access') || null;
}

/**
 * Build authenticated headers object.
 */
export function authHeaders(token) {
    return {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };
}

// ----- Utilities -----------------------------------------------------------

export function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Fetch product list and return an array of product IDs. */
export function fetchProductIds(token, limit = 20) {
    const res = http.get(
        `${BASE.api}/products?limit=${limit}`,
        authHeaders(token),
    );
    if (res.status !== 200) return [];
    const data = res.json();
    const items = Array.isArray(data) ? data : (data.results || data.items || []);
    return items.map((p) => p.id).filter(Boolean);
}
