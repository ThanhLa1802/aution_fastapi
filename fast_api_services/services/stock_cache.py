"""
Redis stock reservation to prevent DB hotspot rows during flash sales.

At 100k RPS with stock=100:
  - ~100 requests pass → PostgreSQL
  - ~99,900 rejected at Redis in microseconds
"""
from typing import List, Tuple
from redis.asyncio import Redis
import logging

logger = logging.getLogger(__name__)

STOCK_KEY_PREFIX = "stock:reserve:"

# Atomic Lua: reserve multiple products in one round-trip.
# Returns:  1 = all reserved,  0 = out of stock,  -1 = cache miss (fall through to DB)
_LUA_RESERVE = """
local n = #KEYS
for i = 1, n do
    local current = redis.call('GET', KEYS[i])
    if current == false then
        for j = 1, i-1 do redis.call('INCRBY', KEYS[j], ARGV[j]) end
        return -1
    end
    if tonumber(current) < tonumber(ARGV[i]) then
        for j = 1, i-1 do redis.call('INCRBY', KEYS[j], ARGV[j]) end
        return 0
    end
    redis.call('DECRBY', KEYS[i], ARGV[i])
end
return 1
"""


def _stock_key(product_id: int) -> str:
    return f"{STOCK_KEY_PREFIX}{product_id}"


async def reserve_stock(redis: Redis, items: List[Tuple[int, int]]) -> int:
    """
    Atomically reserve stock for (product_id, quantity) pairs.

    Returns:
        1  — reserved (proceed to DB)
        0  — out of stock (reject immediately, no DB hit)
       -1  — cache miss (fall through to DB, no reservation held)
    """
    if not items:
        return 1

    keys = [_stock_key(pid) for pid, _ in items]
    args = [str(qty) for _, qty in items]

    try:
        result = await redis.eval(_LUA_RESERVE, len(keys), *keys, *args)
        return int(result)
    except Exception as e:
        logger.error(f"Redis stock reservation failed: {e}. Falling through to DB.")
        return -1  # Never block checkout on Redis errors


async def release_stock(redis: Redis, items: List[Tuple[int, int]]) -> None:
    """Roll back a reservation when DB checkout fails."""
    if not items:
        return
    try:
        pipe = redis.pipeline()
        for product_id, quantity in items:
            pipe.incrby(_stock_key(product_id), quantity)
        await pipe.execute()
    except Exception as e:
        logger.error(f"Redis stock release failed: {e}")


async def restore_stock(redis: Redis, items: List[Tuple[int, int]]) -> None:
    """Restore stock after an order is cancelled."""
    await release_stock(redis, items)


async def warm_all_products(redis: Redis, products: List[dict]) -> int:
    """
    Bulk-load stock into Redis from a list of {'id': int, 'stock': int} dicts.
    Call before a flash sale or on service startup.
    """
    if not products:
        return 0
    try:
        pipe = redis.pipeline()
        for p in products:
            pipe.set(_stock_key(p['id']), p['stock'])
        await pipe.execute()
        logger.info(f"Warmed Redis stock cache for {len(products)} products")
        return len(products)
    except Exception as e:
        logger.error(f"Failed to warm stock cache: {e}")
        return 0


async def get_cached_stock(redis: Redis, product_id: int) -> int | None:
    """Return current cached stock or None if not warmed."""
    try:
        val = await redis.get(_stock_key(product_id))
        return int(val) if val is not None else None
    except Exception:
        return None
