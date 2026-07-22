from django.core.management.base import BaseCommand

from bins.models import Alert, AppSetting, Bin, BinReading
from bins.views import _sync_alert_for_reading


SEED_BINS = [
    {'bin_id': 'BIN-01', 'location': 'Main Gate', 'zone': 'A', 'lat': 12.9714, 'lng': 80.0438, 'fill_pct': 91},
    {'bin_id': 'BIN-02', 'location': 'Canteen Block', 'zone': 'A', 'lat': 12.9709, 'lng': 80.0446, 'fill_pct': 83},
    {'bin_id': 'BIN-03', 'location': 'Library', 'zone': 'B', 'lat': 12.9702, 'lng': 80.0432, 'fill_pct': 47},
    {'bin_id': 'BIN-04', 'location': 'Sports Ground', 'zone': 'B', 'lat': 12.9694, 'lng': 80.0454, 'fill_pct': 22},
    {'bin_id': 'BIN-05', 'location': 'Admin Block', 'zone': 'C', 'lat': 12.9719, 'lng': 80.0424, 'fill_pct': 78},
    {'bin_id': 'BIN-06', 'location': 'Hostel Block', 'zone': 'C', 'lat': 12.9689, 'lng': 80.0439, 'fill_pct': 65},
    {'bin_id': 'BIN-07', 'location': 'Parking Lot', 'zone': 'D', 'lat': 12.9699, 'lng': 80.0462, 'fill_pct': 11},
    {'bin_id': 'BIN-08', 'location': 'Lab Complex', 'zone': 'D', 'lat': 12.9712, 'lng': 80.0449, 'fill_pct': 54},
]

DEFAULT_SETTINGS = {
    'organisation_name': 'SmartBin Demo',
    'timezone': 'UTC+05:30',
    'offline_after_minutes': '5',
    'notification_email': 'ops@example.com',
}


def fill_to_distance(bin_obj, fill_pct):
    return round((1 - fill_pct / 100) * bin_obj.depth_cm, 2)


class Command(BaseCommand):
    help = 'Seed the database with SmartBin demo locations, settings, readings, and alerts.'

    def handle(self, *args, **options):
        created_bins = 0
        created_readings = 0

        for key, value in DEFAULT_SETTINGS.items():
            AppSetting.objects.get_or_create(key=key, defaults={'value': value})

        for seed in SEED_BINS:
            data = seed.copy()
            fill_pct = data.pop('fill_pct')

            bin_obj, bin_created = Bin.objects.update_or_create(
                bin_id=data['bin_id'],
                defaults={
                    **data,
                    'depth_cm': 40.0,
                    'alert_threshold_pct': 80.0,
                    'route_threshold_pct': 60.0,
                    'device_api_key': '',
                },
            )

            if bin_created:
                created_bins += 1
                self.stdout.write(f'  [+] Created bin: {bin_obj.bin_id} - {bin_obj.location}')
            else:
                self.stdout.write(f'  [~] Updated bin: {bin_obj.bin_id}')

            if not bin_obj.readings.exists():
                reading = BinReading.objects.create(
                    bin=bin_obj,
                    fill_pct=fill_pct,
                    distance_cm=fill_to_distance(bin_obj, fill_pct),
                )
                _sync_alert_for_reading(bin_obj, reading)
                created_readings += 1
                self.stdout.write(f'      Reading: fill={fill_pct}% distance={reading.distance_cm}cm')

        open_alerts = Alert.objects.filter(status=Alert.STATUS_OPEN).count()
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {created_bins} bins, {created_readings} readings, {open_alerts} open alerts.'
        ))
