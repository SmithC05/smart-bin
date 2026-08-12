import os
import django
from django.db.models import Count, Min, Max

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbin.settings')
django.setup()

from bins.models import Bin, BinReading, Alert, CollectionRecord

print("--- DATA AUDIT ---")
print(f"Total Bins: {Bin.objects.count()}")
print(f"Real Bins: {Bin.objects.filter(data_source='REAL').count()}")
print(f"Simulated Bins: {Bin.objects.filter(data_source='SIMULATED').count()}")

print(f"Total Readings: {BinReading.objects.count()}")

earliest = BinReading.objects.aggregate(Min('recorded_at'))['recorded_at__min']
latest = BinReading.objects.aggregate(Max('recorded_at'))['recorded_at__max']

print(f"Earliest reading: {earliest}")
print(f"Latest reading: {latest}")

print("Readings per bin:")
bins_with_readings = Bin.objects.annotate(reading_count=Count('readings')).values('bin_id', 'reading_count')
for b in bins_with_readings:
    print(f"  {b['bin_id']}: {b['reading_count']}")

print("Collection records count:")
print(f"Total Collection Records: {CollectionRecord.objects.count()}")

print("Alerts count:")
print(f"Total Alerts: {Alert.objects.count()}")
