from django.core.management.base import BaseCommand
from orders.models import Category, Product
from decimal import Decimal


CATEGORIES = [
    {'name': 'Smartphones',  'slug': 'smartphones'},
    {'name': 'Laptops',      'slug': 'laptops'},
    {'name': 'Tablets',      'slug': 'tablets'},
    {'name': 'Headphones',   'slug': 'headphones'},
    {'name': 'Cameras',      'slug': 'cameras'},
    {'name': 'Smartwatches', 'slug': 'smartwatches'},
    {'name': 'Gaming',       'slug': 'gaming'},
    {'name': 'Accessories',  'slug': 'accessories'},
]

PRODUCTS = [
    # Smartphones
    {'name': 'iPhone 15 Pro', 'description': '6.1-inch Super Retina XDR display, A17 Pro chip, titanium design.', 'price': '999.00', 'stock': 50, 'category': 'smartphones'},
    {'name': 'Samsung Galaxy S24 Ultra', 'description': '6.8-inch Dynamic AMOLED, Snapdragon 8 Gen 3, 200MP camera.', 'price': '1199.00', 'stock': 40, 'category': 'smartphones'},
    {'name': 'Google Pixel 8 Pro', 'description': '6.7-inch LTPO OLED, Google Tensor G3, advanced AI features.', 'price': '899.00', 'stock': 30, 'category': 'smartphones'},
    {'name': 'OnePlus 12', 'description': '6.82-inch 120Hz ProXDR, Snapdragon 8 Gen 3, 100W charging.', 'price': '699.00', 'stock': 35, 'category': 'smartphones'},
    {'name': 'Xiaomi 14 Ultra', 'description': '6.73-inch AMOLED, Leica quad camera, 90W wireless charging.', 'price': '849.00', 'stock': 25, 'category': 'smartphones'},

    # Laptops
    {'name': 'MacBook Pro 14"', 'description': 'Apple M3 Pro chip, Liquid Retina XDR display, 18-hour battery.', 'price': '1999.00', 'stock': 20, 'category': 'laptops'},
    {'name': 'Dell XPS 15', 'description': 'Intel Core i9-13900H, OLED display, NVIDIA RTX 4070, 32GB RAM.', 'price': '1799.00', 'stock': 15, 'category': 'laptops'},
    {'name': 'ASUS ROG Zephyrus G14', 'description': 'AMD Ryzen 9, RTX 4060, 2560x1600 165Hz display, gaming powerhouse.', 'price': '1499.00', 'stock': 18, 'category': 'laptops'},
    {'name': 'Lenovo ThinkPad X1 Carbon', 'description': 'Intel Core i7-1365U, 14-inch IPS, ultralight 1.12 kg, business essential.', 'price': '1399.00', 'stock': 22, 'category': 'laptops'},
    {'name': 'Microsoft Surface Laptop 5', 'description': '13.5-inch PixelSense, Intel Core i5/i7, Windows 11 Home.', 'price': '1299.00', 'stock': 12, 'category': 'laptops'},

    # Tablets
    {'name': 'iPad Pro 12.9"', 'description': 'M2 chip, Liquid Retina XDR, Thunderbolt / USB 4, ProMotion 120Hz.', 'price': '1099.00', 'stock': 28, 'category': 'tablets'},
    {'name': 'Samsung Galaxy Tab S9 Ultra', 'description': '14.6-inch Dynamic AMOLED 2X, Snapdragon 8 Gen 2, S Pen included.', 'price': '1199.00', 'stock': 16, 'category': 'tablets'},
    {'name': 'Lenovo Tab P12 Pro', 'description': '12.6-inch AMOLED, MediaTek Kompanio 1300T, JBL quad speakers.', 'price': '599.00', 'stock': 20, 'category': 'tablets'},

    # Headphones
    {'name': 'Sony WH-1000XM5', 'description': 'Industry-leading noise cancellation, 30-hour battery, hi-res audio.', 'price': '349.00', 'stock': 60, 'category': 'headphones'},
    {'name': 'Apple AirPods Pro 2nd Gen', 'description': 'H2 chip, Adaptive Transparency, Personalized Spatial Audio, MagSafe.', 'price': '249.00', 'stock': 80, 'category': 'headphones'},
    {'name': 'Bose QuietComfort 45', 'description': 'World-class noise cancellation, 24-hour battery, comfortable design.', 'price': '279.00', 'stock': 45, 'category': 'headphones'},
    {'name': 'Samsung Galaxy Buds2 Pro', 'description': '24-bit Hi-Fi audio, intelligent ANC, 360 audio.', 'price': '199.00', 'stock': 55, 'category': 'headphones'},

    # Cameras
    {'name': 'Sony Alpha A7 IV', 'description': '33MP full-frame BSI CMOS, 4K 60fps, 10fps continuous shooting.', 'price': '2499.00', 'stock': 10, 'category': 'cameras'},
    {'name': 'Canon EOS R6 Mark II', 'description': '24.2MP full-frame, 6K RAW video, subject-tracking AF, 40fps burst.', 'price': '2499.00', 'stock': 8, 'category': 'cameras'},
    {'name': 'DJI Osmo Pocket 3', 'description': '1-inch CMOS sensor, 4K/120fps, 3-axis stabilization, pocket-sized.', 'price': '519.00', 'stock': 30, 'category': 'cameras'},

    # Smartwatches
    {'name': 'Apple Watch Series 9', 'description': 'S9 chip, Double Tap gesture, Always-On Retina display, health suite.', 'price': '399.00', 'stock': 50, 'category': 'smartwatches'},
    {'name': 'Samsung Galaxy Watch 6 Classic', 'description': 'Rotating bezel, BioActive sensor, sleep coaching, Wear OS.', 'price': '329.00', 'stock': 35, 'category': 'smartwatches'},
    {'name': 'Garmin Fenix 7X Solar', 'description': 'Solar charging, multi-GNSS, 28-day battery, rugged sports watch.', 'price': '899.00', 'stock': 15, 'category': 'smartwatches'},

    # Gaming
    {'name': 'PlayStation 5 Slim', 'description': 'Custom AMD RDNA 2, 4K 120fps, DualSense haptic feedback, 1TB SSD.', 'price': '499.00', 'stock': 20, 'category': 'gaming'},
    {'name': 'Xbox Series X', 'description': '12 teraflops GPU, 4K 60fps capable, 1TB NVMe SSD, Quick Resume.', 'price': '499.00', 'stock': 18, 'category': 'gaming'},
    {'name': 'Nintendo Switch OLED', 'description': '7-inch OLED screen, enhanced audio, 64GB storage, tabletop mode.', 'price': '349.00', 'stock': 45, 'category': 'gaming'},
    {'name': 'Razer DeathAdder V3 Pro', 'description': 'Focus Pro 30K optical sensor, 90-hour wireless, HyperSpeed.', 'price': '149.00', 'stock': 70, 'category': 'gaming'},
    {'name': 'Logitech G Pro X Keyboard', 'description': 'GX Blue clicky switches, tenkeyless, 16.8M color LIGHTSYNC RGB.', 'price': '129.00', 'stock': 60, 'category': 'gaming'},

    # Accessories
    {'name': 'Anker 65W GaN Charger', 'description': 'Compact 3-port USB-C/A, PowerIQ 3.0, folds flat, universal compatibility.', 'price': '45.00', 'stock': 100, 'category': 'accessories'},
    {'name': 'Samsung 990 Pro 2TB SSD', 'description': 'PCIe 4.0 NVMe, 7450 MB/s read, heat management, 5-year warranty.', 'price': '169.00', 'stock': 40, 'category': 'accessories'},
    {'name': 'Logitech MX Master 3S', 'description': '8K DPI sensor, MagSpeed scroll, 70-day battery, multi-device.', 'price': '99.00', 'stock': 75, 'category': 'accessories'},
    {'name': 'Belkin USB-C Hub 7-in-1', 'description': '4K HDMI, 100W PD, USB-A 3.0 x2, SD/microSD, USB-C data.', 'price': '59.00', 'stock': 60, 'category': 'accessories'},
]


class Command(BaseCommand):
    help = 'Seed technology categories and products'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Delete existing tech data before seeding')

    def handle(self, *args, **options):
        if options['clear']:
            Product.objects.filter(category__slug__in=[c['slug'] for c in CATEGORIES]).delete()
            Category.objects.filter(slug__in=[c['slug'] for c in CATEGORIES]).delete()
            self.stdout.write(self.style.WARNING('Cleared existing tech data.'))

        # Create categories
        cat_map = {}
        for c in CATEGORIES:
            obj, created = Category.objects.get_or_create(slug=c['slug'], defaults={'name': c['name']})
            cat_map[c['slug']] = obj
            status = 'Created' if created else 'Exists '
            self.stdout.write(f'  [{status}] Category: {obj.name}')

        # Create products
        created_count = 0
        for p in PRODUCTS:
            category = cat_map[p['category']]
            _, created = Product.objects.get_or_create(
                name=p['name'],
                defaults={
                    'description': p['description'],
                    'price': Decimal(p['price']),
                    'stock': p['stock'],
                    'status': 1,
                    'category': category,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f'  [Created] {p["name"]}')
            else:
                self.stdout.write(self.style.WARNING(f'  [Exists ] {p["name"]}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {len(CATEGORIES)} categories, {created_count} new products seeded.'
        ))
