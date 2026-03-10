from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool

pool = ConnectionPool(
    host="redis",
    port=6379,
    decode_responses=True,
    max_connections=20
)

redis_client = Redis(connection_pool=pool)

async def get_redis() -> Redis:
    return redis_client