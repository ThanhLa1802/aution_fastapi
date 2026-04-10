import django_setup  # noqa: F401 — must be first; initialises Django ORM

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from decimal import Decimal
import logging

from routers import products, cart, wishlist, reviews, orders
from database import init_elasticsearch, elasticsearch_client, health_check_elasticsearch, PRODUCT_INDEX
from services.indexing_service import indexing_service

logger = logging.getLogger(__name__)

app = FastAPI(
    title='Ecommerce API',
    version='1.0.0',
    docs_url='/docs',
    redoc_url='/redoc',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

PREFIX = '/api/v1'
app.include_router(products.router, prefix=PREFIX)
app.include_router(cart.router, prefix=PREFIX)
app.include_router(wishlist.router, prefix=PREFIX)
app.include_router(reviews.router, prefix=PREFIX)
app.include_router(orders.router, prefix=PREFIX)


@app.get('/')
def root():
    return {'message': 'Ecommerce FastAPI service is running', 'docs': '/docs'}


@app.on_event('startup')
async def startup_event():
    """Initialize Elasticsearch and auto-sync products if index is empty."""
    logger.info('Initializing Elasticsearch...')
    try:
        await init_elasticsearch()
        logger.info('Elasticsearch initialized successfully')

        # Auto-sync products if index is empty
        count_resp = await elasticsearch_client.count(index=PRODUCT_INDEX)
        doc_count = count_resp.get('count', 0)
        if doc_count == 0:
            logger.info('Elasticsearch index is empty — syncing products from database...')
            await _sync_all_products()
        else:
            logger.info(f'Elasticsearch index already has {doc_count} documents, skipping auto-sync')
    except Exception as e:
        logger.error(f'Failed to initialize Elasticsearch: {e}')


async def _sync_all_products():
    """Fetch all active products from the database and bulk-index them."""
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlmodel import select
        from models import Product
        from database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Product).where(Product.status == 1))
            products_list = result.scalars().all()

        if not products_list:
            logger.info('No products found in database to sync')
            return

        product_dicts = []
        for p in products_list:
            d = p.model_dump()
            # Convert Decimal to float for Elasticsearch
            if isinstance(d.get('price'), Decimal):
                d['price'] = float(d['price'])
            product_dicts.append(d)

        success, errors = await indexing_service.bulk_index_products(product_dicts)
        logger.info(f'Auto-sync complete: {success} indexed, {errors} errors')
    except Exception as e:
        logger.error(f'Auto-sync failed: {e}')


@app.on_event('shutdown')
async def shutdown_event():
    """Close Elasticsearch connection on shutdown."""
    logger.info('Closing Elasticsearch connection...')
    try:
        await elasticsearch_client.close()
        logger.info('Elasticsearch connection closed')
    except Exception as e:
        logger.error(f'Error closing Elasticsearch connection: {e}')


@app.get('/health/es')
async def health_check():
    """Health check endpoint for Elasticsearch."""
    healthy = await health_check_elasticsearch()
    if healthy:
        return {'status': 'ok', 'elasticsearch': 'healthy'}
    else:
        return {'status': 'error', 'elasticsearch': 'unhealthy'}

