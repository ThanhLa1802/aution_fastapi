from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from elasticsearch import AsyncElasticsearch
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql+asyncpg://postgres:postgres@localhost:5432/ecommerce'
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Elasticsearch client
ELASTICSEARCH_URL = os.environ.get('ELASTICSEARCH_URL', 'http://localhost:9200')
elasticsearch_client = AsyncElasticsearch(hosts=[ELASTICSEARCH_URL])

# Product index name and mapping
PRODUCT_INDEX = 'products'

PRODUCT_INDEX_MAPPING = {
    'settings': {
        'number_of_shards': 1,
        'number_of_replicas': 0,
        'analysis': {
            'analyzer': {
                'text_analyzer': {
                    'type': 'standard',
                    'stopwords': '_english_'
                }
            }
        }
    },
    'mappings': {
        'properties': {
            'id': {'type': 'keyword'},
            'name': {
                'type': 'text',
                'fields': {'keyword': {'type': 'keyword'}},
                'analyzer': 'text_analyzer'
            },
            'description': {
                'type': 'text',
                'analyzer': 'text_analyzer'
            },
            'price': {'type': 'float'},
            'stock': {'type': 'integer'},
            'status': {'type': 'integer'},
            'category_id': {'type': 'keyword'},
            'in_stock': {'type': 'boolean'},
            'created_at': {'type': 'date'},
            'updated_at': {'type': 'date'}
        }
    }
}


async def init_elasticsearch():
    """Initialize Elasticsearch index if it doesn't exist."""
    try:
        exists = await elasticsearch_client.indices.exists(index=PRODUCT_INDEX)
        if not exists:
            await elasticsearch_client.indices.create(index=PRODUCT_INDEX, body=PRODUCT_INDEX_MAPPING)
            print(f"Created Elasticsearch index: {PRODUCT_INDEX}")
        else:
            print(f"Elasticsearch index already exists: {PRODUCT_INDEX}")
    except Exception as e:
        print(f"Error initializing Elasticsearch: {e}")


async def health_check_elasticsearch():
    """Check if Elasticsearch is healthy."""
    try:
        info = await elasticsearch_client.info()
        return True
    except Exception as e:
        print(f"Elasticsearch health check failed: {e}")
        return False

