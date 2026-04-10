/**
 * SMOKE TEST — fast sanity check, 1 VU, ~30 s.
 *
 * Verifies every critical endpoint returns the expected status code.
 * Run before any heavier test.
 *
 * Usage:
 *   k6 run k6/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, login, authHeaders, fetchProductIds, randomItem } from './helpers.js';

export const options = {
    vus: 1,
    duration: '30s',
    thresholds: {
        http_req_failed: ['rate<0.01'],       // <1 % errors
        http_req_duration: ['p(95)<2000'],      // 95th percentile < 2 s
    },
};

export default function () {
    // 1. Login
    const token = login('lathanhmta', 'Thanhmta96@');
    if (!token) return;
    const h = authHeaders(token);

    // 2. Product list
    let res = http.get(`${BASE.api}/products`, h);
    check(res, { 'GET /products 200': (r) => r.status === 200 });

    // 3. Autocomplete
    res = http.get(`${BASE.api}/products/autocomplete?q=phone`, h);
    check(res, { 'GET autocomplete 200': (r) => r.status === 200 });

    // 4. Categories
    res = http.get(`${BASE.api}/products/categories`, h);
    check(res, { 'GET /categories 200': (r) => r.status === 200 });

    // 5. Product detail
    const ids = fetchProductIds(token);
    if (ids.length > 0) {
        const pid = randomItem(ids);
        res = http.get(`${BASE.api}/products/${pid}`, h);
        check(res, { 'GET /products/:id 200': (r) => r.status === 200 });

        // 6. Reviews
        res = http.get(`${BASE.api}/products/${pid}/reviews`, h);
        check(res, { 'GET reviews 200': (r) => r.status === 200 });

        // 7. Add to cart
        res = http.post(
            `${BASE.api}/cart/add`,
            JSON.stringify({ product_id: pid, quantity: 1 }),
            h,
        );
        check(res, { 'POST cart/add 201': (r) => r.status === 201 });
    }

    // 8. Get cart
    res = http.get(`${BASE.api}/cart`, h);
    check(res, { 'GET /cart 200': (r) => r.status === 200 });

    // 9. Orders list
    res = http.get(`${BASE.api}/orders`, h);
    check(res, { 'GET /orders 200': (r) => r.status === 200 });

    // 10. Wishlist
    res = http.get(`${BASE.api}/wishlist`, h);
    check(res, { 'GET /wishlist 200': (r) => r.status === 200 });

    sleep(1);
}
