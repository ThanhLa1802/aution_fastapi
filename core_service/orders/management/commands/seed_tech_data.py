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
    {'name': 'iPhone 15 Pro', 'description': '6.1-inch Super Retina XDR display, A17 Pro chip, titanium design.', 'price': '28990000.00', 'stock': 50, 'category': 'smartphones', 'image': 'https://picsum.photos/seed/iphone15pro/600/400'},
    {'name': 'Samsung Galaxy S24 Ultra', 'description': '6.8-inch Dynamic AMOLED, Snapdragon 8 Gen 3, 200MP camera.', 'price': '31990000.00', 'stock': 40, 'category': 'smartphones', 'image': 'https://picsum.photos/seed/s24ultra/600/400'},
    {'name': 'Google Pixel 8 Pro', 'description': '6.7-inch LTPO OLED, Google Tensor G3, advanced AI features.', 'price': '23990000.00', 'stock': 30, 'category': 'smartphones', 'image': 'https://picsum.photos/seed/pixel8pro/600/400'},
    {'name': 'OnePlus 12', 'description': '6.82-inch 120Hz ProXDR, Snapdragon 8 Gen 3, 100W charging.', 'price': '18990000.00', 'stock': 35, 'category': 'smartphones', 'image': 'https://picsum.photos/seed/oneplus12/600/400'},
    {'name': 'Xiaomi 14 Ultra', 'description': '6.73-inch AMOLED, Leica quad camera, 90W wireless charging.', 'price': '22990000.00', 'stock': 25, 'category': 'smartphones', 'image': 'https://picsum.photos/seed/xiaomi14ultra/600/400'},

    # Laptops
    {'name': 'MacBook Pro 14"', 'description': 'Apple M3 Pro chip, Liquid Retina XDR display, 18-hour battery.', 'price': '49990000.00', 'stock': 20, 'category': 'laptops', 'image': 'https://picsum.photos/seed/macbookpro14/600/400'},
    {'name': 'Dell XPS 15', 'description': 'Intel Core i9-13900H, OLED display, NVIDIA RTX 4070, 32GB RAM.', 'price': '45990000.00', 'stock': 15, 'category': 'laptops', 'image': 'https://picsum.photos/seed/dellxps15/600/400'},
    {'name': 'ASUS ROG Zephyrus G14', 'description': 'AMD Ryzen 9, RTX 4060, 2560x1600 165Hz display, gaming powerhouse.', 'price': '37990000.00', 'stock': 18, 'category': 'laptops', 'image': 'https://picsum.photos/seed/rogzephyrus/600/400'},
    {'name': 'Lenovo ThinkPad X1 Carbon', 'description': 'Intel Core i7-1365U, 14-inch IPS, ultralight 1.12 kg, business essential.', 'price': '35990000.00', 'stock': 22, 'category': 'laptops', 'image': 'https://picsum.photos/seed/thinkpadx1/600/400'},
    {'name': 'Microsoft Surface Laptop 5', 'description': '13.5-inch PixelSense, Intel Core i5/i7, Windows 11 Home.', 'price': '33990000.00', 'stock': 12, 'category': 'laptops', 'image': 'https://picsum.photos/seed/surfacelaptop5/600/400'},

    # Tablets
    {'name': 'iPad Pro 12.9"', 'description': 'M2 chip, Liquid Retina XDR, Thunderbolt / USB 4, ProMotion 120Hz.', 'price': '28990000.00', 'stock': 28, 'category': 'tablets', 'image': 'https://picsum.photos/seed/ipadpro129/600/400'},
    {'name': 'Samsung Galaxy Tab S9 Ultra', 'description': '14.6-inch Dynamic AMOLED 2X, Snapdragon 8 Gen 2, S Pen included.', 'price': '29990000.00', 'stock': 16, 'category': 'tablets', 'image': 'https://picsum.photos/seed/tabs9ultra/600/400'},
    {'name': 'Lenovo Tab P12 Pro', 'description': '12.6-inch AMOLED, MediaTek Kompanio 1300T, JBL quad speakers.', 'price': '15990000.00', 'stock': 20, 'category': 'tablets', 'image': 'https://picsum.photos/seed/lenovotabp12/600/400'},

    # Headphones
    {'name': 'Sony WH-1000XM5', 'description': 'Industry-leading noise cancellation, 30-hour battery, hi-res audio.', 'price': '8990000.00', 'stock': 60, 'category': 'headphones', 'image': 'https://picsum.photos/seed/sonywh1000xm5/600/400'},
    {'name': 'Apple AirPods Pro 2nd Gen', 'description': 'H2 chip, Adaptive Transparency, Personalized Spatial Audio, MagSafe.', 'price': '6490000.00', 'stock': 80, 'category': 'headphones', 'image': 'https://picsum.photos/seed/airpodspro2/600/400'},
    {'name': 'Bose QuietComfort 45', 'description': 'World-class noise cancellation, 24-hour battery, comfortable design.', 'price': '7490000.00', 'stock': 45, 'category': 'headphones', 'image': 'https://picsum.photos/seed/boseqc45/600/400'},
    {'name': 'Samsung Galaxy Buds2 Pro', 'description': '24-bit Hi-Fi audio, intelligent ANC, 360 audio.', 'price': '4490000.00', 'stock': 55, 'category': 'headphones', 'image': 'https://picsum.photos/seed/galaxybuds2pro/600/400'},

    # Cameras
    {'name': 'Sony Alpha A7 IV', 'description': '33MP full-frame BSI CMOS, 4K 60fps, 10fps continuous shooting.', 'price': '62990000.00', 'stock': 10, 'category': 'cameras', 'image': 'https://picsum.photos/seed/sonya7iv/600/400'},
    {'name': 'Canon EOS R6 Mark II', 'description': '24.2MP full-frame, 6K RAW video, subject-tracking AF, 40fps burst.', 'price': '62990000.00', 'stock': 8, 'category': 'cameras', 'image': 'https://picsum.photos/seed/canonr6ii/600/400'},
    {'name': 'DJI Osmo Pocket 3', 'description': '1-inch CMOS sensor, 4K/120fps, 3-axis stabilization, pocket-sized.', 'price': '13490000.00', 'stock': 30, 'category': 'cameras', 'image': 'https://picsum.photos/seed/djiosmo3/600/400'},

    # Smartwatches
    {'name': 'Apple Watch Series 9', 'description': 'S9 chip, Double Tap gesture, Always-On Retina display, health suite.', 'price': '10990000.00', 'stock': 50, 'category': 'smartwatches', 'image': 'https://picsum.photos/seed/applewatchs9/600/400'},
    {'name': 'Samsung Galaxy Watch 6 Classic', 'description': 'Rotating bezel, BioActive sensor, sleep coaching, Wear OS.', 'price': '8490000.00', 'stock': 35, 'category': 'smartwatches', 'image': 'https://picsum.photos/seed/galaxywatch6/600/400'},
    {'name': 'Garmin Fenix 7X Solar', 'description': 'Solar charging, multi-GNSS, 28-day battery, rugged sports watch.', 'price': '22490000.00', 'stock': 15, 'category': 'smartwatches', 'image': 'https://picsum.photos/seed/garminfenix7x/600/400'},

    # Gaming
    {'name': 'PlayStation 5 Slim', 'description': 'Custom AMD RDNA 2, 4K 120fps, DualSense haptic feedback, 1TB SSD.', 'price': '12990000.00', 'stock': 20, 'category': 'gaming', 'image': 'https://picsum.photos/seed/ps5slim/600/400'},
    {'name': 'Xbox Series X', 'description': '12 teraflops GPU, 4K 60fps capable, 1TB NVMe SSD, Quick Resume.', 'price': '12990000.00', 'stock': 18, 'category': 'gaming', 'image': 'https://picsum.photos/seed/xboxseriesx/600/400'},
    {'name': 'Nintendo Switch OLED', 'description': '7-inch OLED screen, enhanced audio, 64GB storage, tabletop mode.', 'price': '8990000.00', 'stock': 45, 'category': 'gaming', 'image': 'https://picsum.photos/seed/switcholed/600/400'},
    {'name': 'Razer DeathAdder V3 Pro', 'description': 'Focus Pro 30K optical sensor, 90-hour wireless, HyperSpeed.', 'price': '3790000.00', 'stock': 70, 'category': 'gaming', 'image': 'https://picsum.photos/seed/razerdeathadder/600/400'},
    {'name': 'Logitech G Pro X Keyboard', 'description': 'GX Blue clicky switches, tenkeyless, 16.8M color LIGHTSYNC RGB.', 'price': '3290000.00', 'stock': 60, 'category': 'gaming', 'image': 'https://picsum.photos/seed/logitechgprox/600/400'},

    # Accessories
    {'name': 'Anker 65W GaN Charger', 'description': 'Compact 3-port USB-C/A, PowerIQ 3.0, folds flat, universal compatibility.', 'price': '1190000.00', 'stock': 100, 'category': 'accessories', 'image': 'https://picsum.photos/seed/anker65w/600/400'},
    {'name': 'Samsung 990 Pro 2TB SSD', 'description': 'PCIe 4.0 NVMe, 7450 MB/s read, heat management, 5-year warranty.', 'price': '4290000.00', 'stock': 40, 'category': 'accessories', 'image': 'https://picsum.photos/seed/samsung990pro/600/400'},
    {'name': 'Logitech MX Master 3S', 'description': '8K DPI sensor, MagSpeed scroll, 70-day battery, multi-device.', 'price': '2590000.00', 'stock': 75, 'category': 'accessories', 'image': 'https://picsum.photos/seed/mxmaster3s/600/400'},
    {'name': 'Belkin USB-C Hub 7-in-1', 'description': '4K HDMI, 100W PD, USB-A 3.0 x2, SD/microSD, USB-C data.', 'price': '1490000.00', 'stock': 60, 'category': 'accessories', 'image': 'https://picsum.photos/seed/belkinhub7in1/600/400'},
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

        # Create / update products
        created_count = 0
        updated_count = 0
        for p in PRODUCTS:
            category = cat_map[p['category']]
            obj, created = Product.objects.update_or_create(
                name=p['name'],
                defaults={
                    'description': p['description'],
                    'price': Decimal(p['price']),
                    'stock': p['stock'],
                    'status': 1,
                    'category': category,
                    'image': p.get('image', ''),
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f'  [Created] {p["name"]}')
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'  [Updated] {p["name"]}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! {len(CATEGORIES)} categories, {created_count} created, {updated_count} updated.'
        ))
