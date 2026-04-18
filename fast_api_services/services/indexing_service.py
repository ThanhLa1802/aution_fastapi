"""
Elasticsearch indexing service for products.
Handles indexing, bulk operations, and search with fallback to PostgreSQL.
"""

from typing import List, Dict, Optional
from datetime import datetime
from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import NotFoundError
import logging

from database import elasticsearch_client, PRODUCT_INDEX

logger = logging.getLogger(__name__)


class IndexingService:
    """Service to manage Elasticsearch indexing of products."""

    def __init__(self, es_client: AsyncElasticsearch = elasticsearch_client):
        self.es = es_client
        self.index_name = PRODUCT_INDEX

    async def index_product(self, product_dict: Dict) -> bool:
        """
        Index a single product in Elasticsearch.
        
        Args:
            product_dict: Product data with id, name, description, price, category_id, stock, status, created_at, updated_at
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Prepare document
            doc = self._prepare_product_doc(product_dict)
            
            # Index the product
            result = await self.es.index(
                index=self.index_name,
                id=str(product_dict['id']),
                body=doc,
                refresh=True
            )
            
            logger.info(f"Indexed product {product_dict['id']}")
            return True
        except Exception as e:
            logger.error(f"Error indexing product {product_dict.get('id')}: {e}")
            return False

    async def bulk_index_products(self, products: List[Dict], batch_size: int = 1000) -> tuple:
        """
        Bulk index multiple products in Elasticsearch.
        
        Args:
            products: List of product dictionaries
            batch_size: Number of products to index per batch
            
        Returns:
            tuple: (success_count, error_count)
        """
        success_count = 0
        error_count = 0
        
        try:
            # Process in batches
            for i in range(0, len(products), batch_size):
                batch = products[i:i + batch_size]
                operations = []
                
                for product in batch:
                    doc = self._prepare_product_doc(product)
                    operations.append({'index': {'_index': self.index_name, '_id': str(product['id'])}})
                    operations.append(doc)
                
                # Bulk operation
                response = await self.es.bulk(body=operations, refresh=True)
                
                if response.get('errors', False):
                    error_count += len([item for item in response.get('items', []) if item.get('index', {}).get('error')])
                    success_count += len(batch) - error_count
                else:
                    success_count += len(batch)
                
                logger.info(f"Bulk indexed {len(batch)} products (batch {i // batch_size + 1})")
        except Exception as e:
            logger.error(f"Error in bulk indexing: {e}")
            error_count = len(products) - success_count
        
        return success_count, error_count

    async def delete_product(self, product_id: int) -> bool:
        """
        Delete a product from Elasticsearch index.
        
        Args:
            product_id: Product ID to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            await self.es.delete(index=self.index_name, id=str(product_id), refresh=True)
            logger.info(f"Deleted product {product_id} from index")
            return True
        except NotFoundError:
            logger.warning(f"Product {product_id} not found in index")
            return True  # Consider deletion of non-existent product as success
        except Exception as e:
            logger.error(f"Error deleting product {product_id}: {e}")
            return False

    async def search_products(
        self,
        query: str,
        category_id: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        in_stock: bool = False,
        limit: int = 20,
        offset: int = 0
    ) -> tuple:
        """
        Search products in Elasticsearch.
        
        Args:
            query: Search query string
            category_id: Filter by category
            min_price: Minimum price filter
            max_price: Maximum price filter
            in_stock: Filter to only in-stock items
            limit: Number of results to return
            offset: Offset for pagination
            
        Returns:
            tuple: (total_count, results_list) or (None, []) if ES is down
        """
        try:
            # Build query
            must_clauses = [
                {'match': {'status': 1}},
                {
                    'multi_match': {
                        'query': query,
                        'fields': ['name^2', 'description'],
                        'fuzziness': 'AUTO'
                    }
                }
            ]
            
            # Add filters
            if category_id is not None:
                must_clauses.append({'match': {'category_id': category_id}})
            
            if in_stock:
                must_clauses.append({'range': {'stock': {'gt': 0}}})
            
            # Price range filter
            if min_price is not None or max_price is not None:
                price_range = {}
                if min_price is not None:
                    price_range['gte'] = min_price
                if max_price is not None:
                    price_range['lte'] = max_price
                must_clauses.append({'range': {'price': price_range}})
            
            search_body = {
                'query': {'bool': {'must': must_clauses}},
                'from': offset,
                'size': limit,
                'sort': [{'created_at': {'order': 'desc'}}]
            }
            
            response = await self.es.search(index=self.index_name, body=search_body)
            
            total = response.get('hits', {}).get('total', {}).get('value', 0)
            results = []
            
            for hit in response.get('hits', {}).get('hits', []):
                doc = hit['_source']
                doc['id'] = hit['_id']  # Ensure ID is set from the ES ID
                results.append(doc)
            
            return total, results
        except Exception as e:
            logger.error(f"Elasticsearch search error: {e}. Falling back to database.")
            return None, []  # Signal to use database fallback

    async def autocomplete(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Autocomplete search on product names.
        
        Args:
            query: Partial query string
            limit: Number of suggestions to return
            
        Returns:
            List of suggestions with id and name, or [] if ES is down
        """
        try:
            search_body = {
                'query': {
                    'bool': {
                        'must': [
                            {'match': {'status': 1}},
                            {
                                'match_phrase_prefix': {
                                    'name': {
                                        'query': query,
                                        'boost': 2
                                    }
                                }
                            }
                        ]
                    }
                },
                'size': limit,
                '_source': ['id', 'name']
            }
            
            response = await self.es.search(index=self.index_name, body=search_body)
            
            suggestions = []
            for hit in response.get('hits', {}).get('hits', []):
                doc = hit['_source']
                doc['id'] = hit['_id']  # Use ES ID as the product ID
                suggestions.append({
                    'id': doc.get('id'),
                    'name': doc.get('name')
                })
            
            return suggestions
        except Exception as e:
            logger.error(f"Elasticsearch autocomplete error: {e}")
            return []

    async def clear_index(self) -> bool:
        """
        Delete all documents from the product index.
        Useful for reindexing.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            result = await self.es.delete_by_query(
                index=self.index_name,
                body={'query': {'match_all': {}}},
                refresh=True
            )
            logger.info(f"Cleared {result.get('deleted', 0)} products from index")
            return True
        except Exception as e:
            logger.error(f"Error clearing index: {e}")
            return False

    def _prepare_product_doc(self, product_dict: Dict) -> Dict:
        """
        Prepare a product document for indexing.
        
        Args:
            product_dict: Raw product data from database
            
        Returns:
            dict: Prepared document for Elasticsearch
        """
        # Convert price from Decimal to float if needed
        price = product_dict.get('price')
        if price is not None:
            price = float(price)
        
        # Determine if in stock
        stock = product_dict.get('stock', 0)
        in_stock = stock > 0
        
        return {
            'name': product_dict.get('name', ''),
            'description': product_dict.get('description', ''),
            'price': price,
            'stock': stock,
            'status': product_dict.get('status', 1),
            'category_id': product_dict.get('category_id'),
            'category_name': product_dict.get('category_name', ''),
            'in_stock': in_stock,
            'created_at': product_dict.get('created_at'),
            'updated_at': product_dict.get('updated_at')
        }


# Create singleton instance
indexing_service = IndexingService()
