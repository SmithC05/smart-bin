from django.utils import timezone
from .models import Bin, CollectionRoute, AppSetting
from .routing_utils import optimize_route

def generate_daily_routes():
    """
    Background task to automatically generate routes for bins that need collection.
    It considers bins with fill_pct >= route_threshold_pct.
    """
    # Fetch all active bins with their latest readings
    bins = Bin.objects.filter(is_active=True).prefetch_related('readings')
    
    candidates = []
    for b in bins:
        latest_reading = b.readings.first()
        if latest_reading and latest_reading.fill_pct >= b.route_threshold_pct:
            candidates.append(b)

    if not candidates:
        print(f"[{timezone.now()}] No bins require collection today.")
        return

    # Assuming we create one route for all candidates, or group them by zone
    # For now, we group by zone to create separate routes per zone
    zones = {}
    for b in candidates:
        zone = b.zone or 'Default'
        if zone not in zones:
            zones[zone] = []
        zones[zone].append(b)

    for zone, zone_bins in zones.items():
        optimized_order = optimize_route(zone_bins)
        route = CollectionRoute.objects.create(
            name=f'Daily Route - Zone {zone} - {timezone.localtime():%Y-%m-%d}',
            optimized_order=optimized_order,
            status=CollectionRoute.STATUS_PLANNED
        )
        route.bins.set(zone_bins)
        print(f"[{timezone.now()}] Created route '{route.name}' with {len(zone_bins)} bins.")
