import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbin.settings')
django.setup()

from django.contrib.auth.models import User
from bins.models import UserProfile

if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    UserProfile.objects.create(user=user, role=UserProfile.ROLE_DISTRICT_COLLECTOR, zone='')
    print("Admin user created (admin / admin123).")
else:
    print("Admin user already exists.")
