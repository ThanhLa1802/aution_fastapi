/**
 * LOAD TEST — realistic concurrent traffic, ramp up → steady → ramp down.
 *
 * Simulates a normal busy day: browsing, searching, adding to cart, checkout.
 * Target: 50 concurrent users over 5 minutes.
 *
 * Usage:
 *   k6 run k6/load.js
 *
 * Pass custom credentials via env:
 *   k6 run -e USERNAME=admin -e PASSWORD=admin k6/load.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE, login, authHeaders, fetchProductIds, randomItem } from './helpers.js';

export const options = {
    stages: [
        { duration: '1m', target: 10 },   // ramp up to 10 VUs
        { duration: '3m', target: 50 },   // ramp up to 50 VUs
        { duration: '2m', target: 50 },   // hold 50 VUs
        { duration: '1m', target: 0 },   // ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],       // <1 % errors
        http_req_duration: ['p(95)<1500'],      // p95 < 1.5 s
        'http_req_duration{name:browse}': ['p(95)<1000'],
        'http_req_duration{name:search}': ['p(95)<1000'],
        'http_req_duration{name:checkout}': ['p(95)<3000'],
    },
};

const USERNAME = __ENV.USERNAME || 'admin';
const PASSWORD = __ENV.PASSWORD || 'admin';

// Cache product IDs to avoid hammering the list endpoint every iteration
let cachedProductIds = [];

export function setup() {
    const token = login(USERNAME, PASSWORD);
    if (!token) throw new Error('Login failed — check credentials');
    return { token };
}

export default function ({ token }) {
    const h = authHeaders(token);

    // Warm product cache once per VU
    if (cachedProductIds.length === 0) {
        cachedProductIds = fetchProductIds(token, 50);
    }

    // 60 % browse, 30 % search + add to cart, 10 % checkout
    const roll = Math.random();

    if (roll < 0.60) {
        // --- Browse scenario ---
        group('browse', () => {
            let res = http.get(`${BASE.api}/products?page=1`, h, { tags: { name: 'browse' } });
            check(res, { 'product list 200': (r) => r.status === 200 });
            sleep(randomBetween(0.5, 1.5));

            if (cachedProductIds.length > 0) {
                const pid = randomItem(cachedProductIds);
                res = http.get(`${BASE.api}/products/${pid}`, h, { tags: { name: 'browse' } });
                check(res, { 'product detail 200': (r) => r.status === 200 });

                // Fetch reviews in parallel (simulates React parallel requests)
                res = http.get(`${BASE.api}/products/${pid}/reviews`, h);
                check(res, { 'reviews 200': (r) => r.status === 200 });
            }
        });

    } else if (roll < 0.90) {
        // --- Search + add to cart scenario ---
        group('search_and_cart', () => {
            const terms = ['phone', 'laptop', 'gaming', 'headphone', 'watch', 'camera'];
            const q = randomItem(terms);

            let res = http.get(
                `${BASE.api}/products?search=${q}`,
                h,
                { tags: { name: 'search' } },
            );
            check(res, { 'search 200': (r) => r.status === 200 });
            sleep(randomBetween(0.3, 1.0));

            // Autocomplete
            res = http.get(
                `${BASE.api}/products/autocomplete?q=${q.slice(0, 3)}`,
                h,
                { tags: { name: 'search' } },
            );
            check(res, { 'autocomplete 200': (r) => r.status === 200 });
            sleep(0.5);

            if (cachedProductIds.length > 0) {
                const pid = randomItem(cachedProductIds);
                res = http.post(
                    `${BASE.api}/cart/add`,
                    JSON.stringify({ product_id: pid, quantity: 1 }),
                    h,
                );
                check(res, { 'add to cart 201': (r) => r.status === 201 });
            }
        });

    } else {
        // --- Checkout scenario ---
        group('checkout', () => {
            // Ensure cart has at least one item
            if (cachedProductIds.length > 0) {
                const pid = randomItem(cachedProductIds);
                http.post(
                    `${BASE.api}/cart/add`,
                    JSON.stringify({ product_id: pid, quantity: 1 }),
                    h,
                );
            }

            const res = http.post(
                `${BASE.api}/orders/checkout`,
                JSON.stringify({}),
                { ...h, tags: { name: 'checkout' } },
            );
            // 201 = success, 429 = sold out (stock gate working), both are acceptable
            check(res, {
                'checkout ok or sold-out': (r) => r.status === 201 || r.status === 429,
            });
        });
    }

    sleep(randomBetween(0.5, 2.0));
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}
