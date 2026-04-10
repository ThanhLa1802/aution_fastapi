/**
 * SOAK TEST — sustained moderate load over a long period.
 *
 * Detects memory leaks, connection pool exhaustion, Redis key expiry bugs,
 * and gradual performance degradation that only surface after hours.
 *
 * Default: 20 VUs for 30 minutes (adjust START_VUS / DURATION via env).
 *
 * Usage:
 *   k6 run k6/soak.js
 *   k6 run -e DURATION=2h -e VUS=30 k6/soak.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE, login, authHeaders, fetchProductIds, randomItem } from './helpers.js';

const p95Trend = new Trend('rolling_p95', true);

const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '30m';

export const options = {
    stages: [
        { duration: '2m', target: VUS },   // ramp up
        { duration: DURATION, target: VUS },   // sustained load
        { duration: '2m', target: 0 },   // ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],        // <1 % errors throughout
        http_req_duration: ['p(95)<2000'],       // p95 must not creep up
        rolling_p95: ['p(95)<2000'],
    },
};

let cachedProductIds = [];

export function setup() {
    const token = login(__ENV.USERNAME || 'admin', __ENV.PASSWORD || 'admin');
    if (!token) throw new Error('Login failed');
    return { token };
}

export default function ({ token }) {
    const h = authHeaders(token);

    if (cachedProductIds.length === 0) {
        cachedProductIds = fetchProductIds(token, 50);
    }

    // Mixed read-heavy workload matching real-world traffic shape
    const roll = Math.random();

    if (roll < 0.50) {
        // Browse products
        const start = Date.now();
        const res = http.get(`${BASE.api}/products`, h);
        p95Trend.add(Date.now() - start);
        check(res, { 'products 200': (r) => r.status === 200 });

    } else if (roll < 0.70) {
        // Search
        const terms = ['phone', 'laptop', 'watch', 'camera'];
        const res = http.get(
            `${BASE.api}/products?search=${randomItem(terms)}`,
            h,
        );
        check(res, { 'search 200': (r) => r.status === 200 });

    } else if (roll < 0.85) {
        // Product detail + reviews (parallel-ish)
        if (cachedProductIds.length > 0) {
            const pid = randomItem(cachedProductIds);
            const [detail, reviews] = http.batch([
                ['GET', `${BASE.api}/products/${pid}`, null, h],
                ['GET', `${BASE.api}/products/${pid}/reviews`, null, h],
            ]);
            check(detail, { 'detail 200': (r) => r.status === 200 });
            check(reviews, { 'reviews 200': (r) => r.status === 200 });
        }

    } else if (roll < 0.95) {
        // Cart ops
        if (cachedProductIds.length > 0) {
            const pid = randomItem(cachedProductIds);
            let res = http.post(
                `${BASE.api}/cart/add`,
                JSON.stringify({ product_id: pid, quantity: 1 }),
                h,
            );
            check(res, { 'cart add 201': (r) => r.status === 201 });
            res = http.get(`${BASE.api}/cart`, h);
            check(res, { 'cart get 200': (r) => r.status === 200 });
        }

    } else {
        // Checkout (5 % of requests)
        const res = http.post(`${BASE.api}/orders/checkout`, JSON.stringify({}), h);
        check(res, {
            'checkout ok or 429': (r) => r.status === 201 || r.status === 429,
        });
    }

    sleep(randomBetween(1, 3));
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}
