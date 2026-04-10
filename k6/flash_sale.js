/**
 * FLASH SALE STRESS TEST — hammer the checkout endpoint.
 *
 * Simulates 200 users all trying to buy the SAME limited-stock product
 * simultaneously. Validates:
 *   - Redis stock gate blocks oversell (no order count > stock)
 *   - 429 responses are returned for sold-out, not 500s
 *   - p95 checkout latency stays under 3 s even under spike load
 *
 * HOW TO USE:
 *   1. Seed a product with low stock (e.g. 10 units):
 *      - Use Django admin or the seed command
 *   2. Set the product ID:
 *      k6 run -e PRODUCT_ID=42 -e STOCK=10 k6/flash_sale.js
 *   3. After the test, verify order count = STOCK:
 *      SELECT COUNT(*) FROM orders_order WHERE ... ;
 *
 * Usage:
 *   k6 run -e PRODUCT_ID=1 -e STOCK=10 k6/flash_sale.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE, register, authHeaders } from './helpers.js';

// Custom metrics
const ordersPlaced = new Counter('orders_placed');
const soldOutRate = new Rate('sold_out_rate');
const checkoutTime = new Trend('checkout_duration_ms', true);

export const options = {
    scenarios: {
        flash_sale_spike: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 250,
            maxVUs: 300,
            stages: [
                { duration: '10s', target: 50 },   // quick ramp-up
                { duration: '30s', target: 200 },   // spike — 200 req/s
                { duration: '10s', target: 0 },   // drop
            ],
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.05'],         // <5 % hard errors (not 429)
        checkout_duration_ms: ['p(95)<3000'],       // p95 checkout < 3 s
        // Expect lots of 429s — that's correct behaviour, NOT a failure
    },
};

const PRODUCT_ID = __ENV.PRODUCT_ID || '1';
const STOCK = parseInt(__ENV.STOCK || '10', 10);

// Each VU registers its own account once (setup per VU via init code)
let _token = null;

export default function () {
    // Lazy login once per VU
    if (!_token) {
        // Use __VU (VU number) + __ITER for uniqueness
        _token = register(`${__VU}_${Date.now()}`);
        if (!_token) return;
    }

    const h = authHeaders(_token);

    // 1. Add the flash-sale product to cart
    let res = http.post(
        `${BASE.api}/cart/add`,
        JSON.stringify({ product_id: parseInt(PRODUCT_ID, 10), quantity: 1 }),
        h,
    );
    if (res.status !== 201 && res.status !== 200) {
        // Cart might already have item — that's fine, proceed to checkout
    }

    // 2. Attempt checkout and measure
    const start = Date.now();
    res = http.post(`${BASE.api}/orders/checkout`, JSON.stringify({}), h);
    checkoutTime.add(Date.now() - start);

    if (res.status === 201) {
        ordersPlaced.add(1);
        soldOutRate.add(0);
        check(res, { 'order created': () => true });
    } else if (res.status === 429) {
        soldOutRate.add(1);
        check(res, { 'sold-out 429 (expected)': () => true });
    } else {
        check(res, { [`unexpected status ${res.status}`]: () => false });
    }

    sleep(0.1);
}

export function handleSummary(data) {
    const placed = data.metrics.orders_placed?.values?.count || 0;
    const p95 = data.metrics.checkout_duration_ms?.values?.['p(95)'] || 0;
    const errRate = data.metrics.http_req_failed?.values?.rate || 0;

    console.log('\n========== Flash Sale Summary ==========');
    console.log(`Orders placed  : ${placed} (expected ≤ ${STOCK})`);
    console.log(`Oversell?      : ${placed > STOCK ? '❌ YES — BUG!' : '✅ NO'}`);
    console.log(`p95 checkout   : ${Math.round(p95)} ms`);
    console.log(`Error rate     : ${(errRate * 100).toFixed(2)} %`);
    console.log('=========================================\n');

    return {};   // let k6 print its default output too
}
