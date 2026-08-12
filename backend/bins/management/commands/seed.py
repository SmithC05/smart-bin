from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from bins.models import AppSetting, UserProfile

DEFAULT_SETTINGS = {
    'organisation_name': 'SmartBin Demo',
    'timezone': 'UTC+05:30',
    'offline_after_minutes': '5',
    'notification_email': 'ops@example.com',
}

DEMO_ACCOUNTS = {
    'sysadmin': UserProfile.ROLE_SYSTEM_ADMIN,
    'municipaladmin': UserProfile.ROLE_MUNICIPAL_ADMIN,
    'officer': UserProfile.ROLE_MUNICIPAL_OFFICER,
    'zonesupervisor': UserProfile.ROLE_ZONE_SUPERVISOR,
    'driver01': UserProfile.ROLE_DRIVER,
    'worker01': UserProfile.ROLE_FIELD_WORKER,
    'auditor': UserProfile.ROLE_AUDITOR,
}

class Command(BaseCommand):
    help = 'Seed the database with default settings and demo accounts.'

    def handle(self, *args, **options):
        for key, value in DEFAULT_SETTINGS.items():
            AppSetting.objects.get_or_create(key=key, defaults={'value': value})

        for username, role in DEMO_ACCOUNTS.items():
            user, _ = User.objects.get_or_create(username=username)
            user.set_password('demo123')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'role': role, 'is_demo': False})
            profile.role = role
            profile.is_demo = False
            profile.save()

        self.stdout.write(self.style.SUCCESS('Done. Seeded default settings and demo accounts.'))
