# bins/management/commands/seed.py
from django.core.management.base import BaseCommand
from bins.models import Bin, BinReading


SEED_BINS = [
    {'bin_id': 'BIN-01', 'location': 'Main Gate',     'zone': 'A', 'lat': 12.8230, 'lng': 80.0444, 'fill_pct': 91},
    {'bin_id': 'BIN-02', 'location': 'Canteen Block',  'zone': 'A', 'lat': 12.8225, 'lng': 80.0452, 'fill_pct': 83},
    {'bin_id': 'BIN-03', 'location': 'Library',        'zone': 'B', 'lat': 12.8218, 'lng': 80.0438, 'fill_pct': 47},
    {'bin_id': 'BIN-04', 'location': 'Sports Ground',  'zone': 'B', 'lat': 12.8210, 'lng': 80.0460, 'fill_pct': 22},
    {'bin_id': 'BIN-05', 'location': 'Admin Block',    'zone': 'C', 'lat': 12.8235, 'lng': 80.0430, 'fill_pct': 78},
    {'bin_id': 'BIN-06', 'location': 'Hostel Block',   'zone': 'C', 'lat': 12.8205, 'lng': 80.0445, 'fill_pct': 65},
    {'bin_id': 'BIN-07', 'location': 'Parking Lot',    'zone': 'D', 'lat': 12.8215, 'lng': 80.0468, 'fill_pct': 11},
    {'bin_id': 'BIN-08', 'location': 'Lab Complex',    'zone': 'D', 'lat': 12.8228, 'lng': 80.0455, 'fill_pct': 54},
]

# BIN_DEPTH_CM must match the value in views.py
BIN_DEPTH_CM = 40.0


def fill_to_distance(fill_pct: float) -> float:
    """Reverse-compute distance_cm from a seed fill_pct value."""
    # fill_pct = (1 - distance / depth) * 100  →  distance = (1 - fill_pct/100) * depth
    return round((1 - fill_pct / 100) * BIN_DEPTH_CM, 2)


class Command(BaseCommand):
    help = 'Seed the database with 8 SmartBin locations and initial readings.'

    def handle(self, *args, **options):
        created_bins    = 0
        created_readings = 0

        for data in SEED_BINS:
            fill_pct    = data.pop('fill_pct')
            distance_cm = fill_to_distance(fill_pct)

            bin_obj, bin_created = Bin.objects.get_or_create(
                bin_id=data['bin_id'],
                defaults=data,
            )

            if bin_created:
                created_bins += 1
                self.stdout.write(f'  [+] Created bin: {bin_obj.bin_id} – {bin_obj.location}')
            else:
                self.stdout.write(f'  [~] Bin already exists: {bin_obj.bin_id}')

            # Always add an initial reading if none exists
            if not bin_obj.readings.exists():
                BinReading.objects.create(
                    bin=bin_obj,
                    fill_pct=fill_pct,
                    distance_cm=distance_cm,
                )
                created_readings += 1
                self.stdout.write(
                    f'       -> Reading: fill={fill_pct}%  distance={distance_cm}cm'
                )

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_bins} bins and {created_readings} readings.'
        ))
