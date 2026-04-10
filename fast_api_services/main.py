import django_setup  # noqa: F401 — must be first; initialises Django ORM

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import products, cart, wishlist, reviews, orders

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

