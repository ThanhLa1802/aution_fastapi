"""
Django management command to index products into Elasticsearch.

Usage:
    python manage.py index_products              # Index all products (incremental)
    python manage.py index_products --rebuild    # Delete and recreate index, then index all products
    python manage.py index_products --clear      # Clear the index without reindexing
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from orders.models import Product

# Add the FastAPI app to path so we can import its modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../fast_api_services'))

from database import elasticsearch_client, init_elasticsearch, PRODUCT_INDEX
from services.indexing_service import IndexingService


class Command(BaseCommand):
    help = 'Index products into Elasticsearch'

    def add_arguments(self, parser):
        parser.add_argument(
            '--rebuild',
            action='store_true',
            help='Delete and recreate the index before indexing',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear the index without reindexing',
        )
        parser.add_argument(
            '--recent',
            type=int,
            default=None,
            help='Index only products updated in the last N hours',
        )

    def handle(self, *args, **options):
        """Main command handler."""
        try:
            asyncio.run(self._async_handle(*args, **options))
        except Exception as e:
            raise CommandError(f'Error indexing products: {e}')

    async def _async_handle(self, *args, **options):
        """Async handler for indexing."""
        rebuild = options['rebuild']
        clear_only = options['clear']
        recent_hours = options['recent']

        self.stdout.write(self.style.SUCCESS('Connecting to Elasticsearch...'))
        
        # Initialize Elasticsearch connection
        indexing_svc = IndexingService(elasticsearch_client)

        try:
            # Initialize index
            await init_elasticsearch()
            self.stdout.write(self.style.SUCCESS('Elasticsearch connected'))
        except Exception as e:
            raise CommandError(f'Failed to connect to Elasticsearch: {e}')

        if clear_only:
            self.stdout.write(self.style.WARNING('Clearing Elasticsearch index...'))
            success = await indexing_svc.clear_index()
            if success:
                self.stdout.write(self.style.SUCCESS('Index cleared successfully'))
            else:
                raise CommandError('Failed to clear index')
            return

        if rebuild:
            self.stdout.write(self.style.WARNING('Rebuilding Elasticsearch index...'))
            try:
                # Delete the index
                try:
                    await elasticsearch_client.indices.delete(index=PRODUCT_INDEX)
                    self.stdout.write(self.style.SUCCESS(f'Deleted index: {PRODUCT_INDEX}'))
                except Exception:
                    pass  # Index might not exist

                # Recreate the index
                await init_elasticsearch()
                self.stdout.write(self.style.SUCCESS(f'Recreated index: {PRODUCT_INDEX}'))
            except Exception as e:
                raise CommandError(f'Failed to rebuild index: {e}')

        # Get products to index
        self.stdout.write('Fetching products from database...')
        queryset = Product.objects.filter(status=1).all()

        if recent_hours:
            cutoff_time = timezone.now() - timedelta(hours=recent_hours)
            queryset = queryset.filter(updated_at__gte=cutoff_time)
            self.stdout.write(f'Indexing products updated in the last {recent_hours} hours')

        products = list(
            queryset.select_related('category').values(
                'id', 'name', 'description', 'price', 'category_id', 'stock', 'status', 'created_at', 'updated_at',
                'category__name',
            )
        )
        for p in products:
            p['category_name'] = p.pop('category__name') or ''

        total = len(products)
        if total == 0:
            self.stdout.write(self.style.WARNING('No products to index'))
            return

        self.stdout.write(f'Found {total} products to index')

        # Convert Decimal fields to float for Elasticsearch
        for product in products:
            if isinstance(product['price'], Decimal):
                product['price'] = float(product['price'])

        # Index products
        self.stdout.write(self.style.SUCCESS('Starting bulk indexing...'))
        success_count, error_count = await indexing_svc.bulk_index_products(products, batch_size=1000)

        self.stdout.write(self.style.SUCCESS(
            f'\nIndexing complete!\n'
            f'  Successfully indexed: {success_count}\n'
            f'  Errors: {error_count}'
        ))

        if error_count > 0:
            self.stdout.write(self.style.WARNING(
                f'Some products failed to index. Please check the logs.'
            ))
