# fast_api_services/django_setup.py
# This module initialises Django's ORM so that FastAPI can call
# Django services (which use transaction.atomic + select_for_update)
# via asgiref.sync.sync_to_async.
#
# It MUST be imported before any module that references Django models.
# In main.py this is the very first import.
import os
import sys

DJANGO_PROJECT_PATH = os.environ.get('DJANGO_PROJECT_PATH', '/django_app')
if DJANGO_PROJECT_PATH not in sys.path:
    sys.path.insert(0, DJANGO_PROJECT_PATH)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django  # noqa: E402
django.setup()
