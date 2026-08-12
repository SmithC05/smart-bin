import random
import uuid
import csv
import os
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from bins.models import (
    Bin, BinReading, Alert, CollectionSchedule, CollectionRecord, CollectionRoute,
    Municipality, Zone, Ward, Depot, ProcessingFacility, Vehicle, UserProfile
)
from django.contrib.auth.models import User
from bins.views import _distance_from_fill

class Command(BaseCommand):
    help = "Generates realistic synthetic historical telemetry for ML training."

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=30, help='Days of history to generate.')
        parser.add_argument('--bins', type=int, default=50, help='Number of synthetic bins to create.')
        parser.add_argument('--interval-minutes', type=int, default=30, help='Telemetry sampling interval in minutes.')
        parser.add_argument('--seed', type=int, help='Random seed for deterministic generation.')
        parser.add_argument('--reset', action='store_true', help='Delete all previously generated synthetic data.')
        parser.add_argument('--export-csv', action='store_true', help='Export generated data to CSV.')
        parser.add_argument('--missing-rate', type=float, default=0.0, help='Probability (0-1) of dropping a reading.')
        parser.add_argument('--include-anomalies', action='store_true', help='Include rare sensor anomalies.')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['seed'] is not None:
            random.seed(options['seed'])

        days = options['days']
        num_bins = options['bins']
        interval_mins = options['interval_minutes']
        missing_rate = options['missing_rate']
        include_anomalies = options['include_anomalies']

        if options['reset']:
            self.stdout.write("Resetting previously generated synthetic data...")
            # Delete synthetic bins (cascades to readings, alerts, and collection records)
            deleted_bins, _ = Bin.objects.filter(data_source='SIMULATED').delete()
            self.stdout.write(f"Deleted {deleted_bins} simulated bins and associated records.")
            
            deleted_schedules, _ = CollectionSchedule.objects.filter(is_demo=True).delete()
            self.stdout.write(f"Deleted {deleted_schedules} demo collection schedules.")
            
            deleted_vehicles, _ = Vehicle.objects.filter(is_demo=True).delete()
            self.stdout.write(f"Deleted {deleted_vehicles} demo vehicles.")
            
            # Note: We won't delete users unless they are marked, but UserProfile has is_demo
            deleted_users, _ = UserProfile.objects.filter(is_demo=True).delete()
            self.stdout.write(f"Deleted {deleted_users} demo users/profiles.")

            self.stdout.write(self.style.SUCCESS("Reset complete. Generating new data..."))

        # 1. Generate or retrieve master data hierarchy
        muni, created = Municipality.objects.get_or_create(
            name="SMARTBIN ML DEMO MUNICIPALITY",
            defaults={'code': 'DEMO-MUNI', 'is_demo': True}
        )
        zones = []
        for i in range(1, 6):
            zone, _ = Zone.objects.get_or_create(name=f"DEMO-ZONE-0{i}", municipality=muni, defaults={'code': f"Z{i}-DEMO", 'is_demo': True})
            zones.append(zone)
            Ward.objects.get_or_create(name=f"DEMO-WARD-{i}A", zone=zone, defaults={'is_demo': True, 'code': f"W{i}A"})
            Ward.objects.get_or_create(name=f"DEMO-WARD-{i}B", zone=zone, defaults={'is_demo': True, 'code': f"W{i}B"})

        wards = list(Ward.objects.filter(zone__in=zones))

        # Fleet and workforce
        depot, _ = Depot.objects.get_or_create(name="DEMO DEPOT", municipality=muni, defaults={'lat': 0, 'lng': 0, 'is_demo': True, 'code': 'DEP-DEMO'})
        facility, _ = ProcessingFacility.objects.get_or_create(name="DEMO FACILITY", municipality=muni, defaults={'lat': 0, 'lng': 0, 'is_demo': True, 'code': 'FAC-DEMO'})
        
        vehicles = []
        for i in range(5):
            veh, _ = Vehicle.objects.get_or_create(
                registration_number=f"DEMO-VEH-{i}", 
                defaults={'is_demo': True, 'municipality': muni, 'depot': depot, 'capacity': 10000, 'vehicle_id': f"VEH-D-{i}"}
            )
            vehicles.append(veh)

        drivers = []
        for i in range(5):
            username = f"demo_driver_{i}"
            user, _ = User.objects.get_or_create(username=username, defaults={'first_name': 'Demo', 'last_name': f'Driver {i}'})
            profile, _ = UserProfile.objects.get_or_create(
                user=user, 
                defaults={'role': UserProfile.ROLE_DRIVER, 'employment_status': 'ACTIVE', 'is_demo': True, 'municipality': muni}
            )
            drivers.append(profile)

        # 2. Generate Bins
        self.stdout.write(f"Generating {num_bins} synthetic bins...")
        bins_created = []
        for i in range(num_bins):
            bin_id = f"SB-ML-{uuid.uuid4().hex[:6].upper()}"
            ward = random.choice(wards)
            zone = ward.zone
            
            # Variation in properties
            depth = random.choice([120, 150, 180, 200, 240])
            
            # Base filling rate (% per hour)
            demand_profile = random.choices(['LOW', 'NORMAL', 'HIGH'], weights=[30, 50, 20])[0]
            if demand_profile == 'LOW':
                base_rate = random.uniform(0.5, 1.2)
            elif demand_profile == 'NORMAL':
                base_rate = random.uniform(1.3, 2.5)
            else:
                base_rate = random.uniform(2.6, 4.5)

            bin_obj = Bin(
                bin_id=bin_id,
                location=f"Simulated Location {i}",
                lat=random.uniform(-90, 90),
                lng=random.uniform(-180, 180),
                municipality=muni,
                zone=zone,
                ward=ward,
                depth_cm=depth,
                alert_threshold_pct=80,
                route_threshold_pct=65,
                data_source='SIMULATED',
                is_active=True
            )
            bin_obj.save()
            # Store metadata for simulation
            bin_obj._base_rate = base_rate
            bin_obj._demand_profile = demand_profile
            bins_created.append(bin_obj)

        # 3. Simulate continuous history
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)
        
        self.stdout.write(f"Simulating telemetry from {start_time.date()} to {end_time.date()}...")
        
        all_readings = []
        all_collection_records = []
        all_schedules = []
        all_routes = []
        all_alerts = []
        
        csv_data = []

        for b in bins_created:
            current_time = start_time
            current_fill = random.uniform(0, 30)
            
            scheduled_collection_time = None
            current_alert = None
            
            while current_time <= end_time:
                # Decide if we skip this reading
                if random.random() < missing_rate:
                    current_time += timedelta(minutes=interval_mins)
                    continue
                
                # Check for collection event
                if scheduled_collection_time and current_time >= scheduled_collection_time:
                    # Execute collection
                    current_fill = random.uniform(1.0, 8.0) # residual
                    
                    # Create schedule and record
                    sched = CollectionSchedule(
                        schedule_id=f"SCH-ML-{uuid.uuid4().hex[:6].upper()}",
                        date=scheduled_collection_time.date(),
                        status='COMPLETED',
                        municipality=b.municipality,
                        zone=b.zone,
                        vehicle=random.choice(vehicles),
                        driver=random.choice(drivers),
                        is_demo=True,
                        created_by=drivers[0].user
                    )
                    all_schedules.append(sched)

                    route = CollectionRoute(
                        schedule=sched,
                        name=f"ROUTE-ML-{uuid.uuid4().hex[:4].upper()}",
                        status='COMPLETED',
                        is_demo=True
                    )
                    all_routes.append(route)
                    
                    rec = CollectionRecord(
                        schedule=sched,
                        route=route,
                        bin=b,
                        status='COLLECTED',
                        arrived_at=scheduled_collection_time - timedelta(minutes=random.randint(5, 15)),
                        collected_at=scheduled_collection_time,
                        is_demo=True
                    )
                    all_collection_records.append(rec)
                    
                    scheduled_collection_time = None
                    
                    # Resolve alert if any
                    if current_alert:
                        current_alert.status = Alert.STATUS_RESOLVED
                        current_alert.resolved_at = scheduled_collection_time
                        all_alerts.append(current_alert)
                        current_alert = None
                
                # Calculate fill increment
                hour = current_time.hour
                is_weekend = current_time.weekday() >= 5
                
                # Diurnal multipliers
                if 8 <= hour < 18:
                    time_mult = random.uniform(1.5, 2.2)
                elif 18 <= hour < 22:
                    time_mult = random.uniform(0.8, 1.2)
                else:
                    time_mult = random.uniform(0.1, 0.3)
                    
                weekend_mult = 0.8 if is_weekend else 1.0
                
                increment = b._base_rate * (interval_mins / 60.0) * time_mult * weekend_mult
                
                # Add noise
                noise = random.uniform(-0.5, 0.5)
                
                # Apply anomaly if enabled
                if include_anomalies and random.random() < 0.0001:
                    # Sudden jump anomaly
                    increment += random.uniform(20, 40)
                
                current_fill = max(0.0, min(100.0, current_fill + increment + noise))
                distance_cm = _distance_from_fill(b, current_fill)
                
                # Create reading
                reading = BinReading(
                    bin=b,
                    fill_pct=round(current_fill, 2),
                    distance_cm=distance_cm,
                    recorded_at=current_time,
                    is_demo=True
                )
                all_readings.append(reading)
                
                if options['export_csv']:
                    hours_since = 0
                    # For simplicity in the script, we can calculate hours_since_collection roughly
                    # or leave it for the dataset builder (AI-2). We will just output basic fields here.
                    csv_data.append([
                        current_time.isoformat(),
                        b.bin_id,
                        b.municipality_id,
                        b.zone_id,
                        b.ward_id,
                        distance_cm,
                        round(current_fill, 2),
                        1 # is_simulated
                    ])
                
                # Handle Alert tracking
                if current_fill >= b.alert_threshold_pct and not current_alert:
                    current_alert = Alert(
                        bin=b,
                        fill_pct=round(current_fill, 2),
                        level=Alert.LEVEL_DANGER,
                        message=f"{b.bin_id} reached critical level.",
                        status=Alert.STATUS_OPEN,
                        created_at=current_time
                    )
                elif current_alert and current_fill < b.alert_threshold_pct:
                    # E.g. anomalous drop without a formal collection, resolve it
                    current_alert.status = Alert.STATUS_RESOLVED
                    current_alert.resolved_at = current_time
                    all_alerts.append(current_alert)
                    current_alert = None

                # Trigger future collection if we cross the route threshold
                if current_fill >= b.route_threshold_pct and not scheduled_collection_time:
                    # Schedule collection 4 to 16 hours in the future
                    scheduled_collection_time = current_time + timedelta(hours=random.uniform(4, 16))

                current_time += timedelta(minutes=interval_mins)

            # If an alert is still open at the end, append it
            if current_alert:
                all_alerts.append(current_alert)

        self.stdout.write(f"Saving {len(all_schedules)} schedules, routes, and collection records...")
        for sched, route, rec in zip(all_schedules, all_routes, all_collection_records):
            sched.save()
            route.schedule = sched
            route.save()
            rec.schedule = sched
            rec.route = route
            rec.save()

        self.stdout.write(f"Bulk inserting {len(all_readings)} readings...")
        BinReading.objects.bulk_create(all_readings, batch_size=5000)
        
        self.stdout.write(f"Bulk inserting {len(all_alerts)} alerts...")
        Alert.objects.bulk_create(all_alerts, batch_size=1000)

        if options['export_csv']:
            csv_path = os.path.join(os.getcwd(), 'synthetic_telemetry.csv')
            with open(csv_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'bin_id', 'municipality_id', 'zone_id', 'ward_id', 'distance_cm', 'fill_pct', 'is_simulated'])
                writer.writerows(csv_data)
            self.stdout.write(self.style.SUCCESS(f"Exported CSV to {csv_path}"))

        # Final Report Generation
        avg_fill = sum(r.fill_pct for r in all_readings) / len(all_readings) if all_readings else 0
        max_fill = max(r.fill_pct for r in all_readings) if all_readings else 0
        critical_readings = sum(1 for r in all_readings if r.fill_pct >= 80)
        bins_reaching_80 = len(set(a.bin_id for a in all_alerts))
        avg_collection_interval = (days * 24) / (len(all_collection_records) / num_bins) if all_collection_records else 0

        self.stdout.write("\n")
        self.stdout.write("SMARTBIN ML HISTORY GENERATED")
        self.stdout.write("-----------------------------")
        self.stdout.write(f"Bins created:              {len(bins_created)}")
        self.stdout.write(f"Simulated readings:        {len(all_readings):,}")
        self.stdout.write(f"Collection events:         {len(all_collection_records)}")
        self.stdout.write(f"Synthetic schedules:       {len(all_schedules)}")
        self.stdout.write("\nPeriod:")
        self.stdout.write(f"{start_time.date()} -> {end_time.date()}")
        self.stdout.write(f"\nSampling:                  {interval_mins} minutes")
        self.stdout.write(f"Average fill:              {avg_fill:.1f}%")
        self.stdout.write(f"Maximum fill:              {max_fill:.1f}%")
        self.stdout.write(f"Critical readings:         {critical_readings:,}")
        self.stdout.write(f"Bins reaching 80%:         {bins_reaching_80}")
        self.stdout.write(f"Average collection int:    {avg_collection_interval:.1f} hours")
        
        self.stdout.write("\nPER-BIN SUMMARY (Sample of 5)")
        self.stdout.write(f"{'BIN':<15} {'READINGS':<10} {'COLLECTIONS':<15} {'AVG FILL':<10} {'MAX FILL':<10} {'BASE RATE':<10}")
        for b in bins_created[:5]:
            b_readings = [r for r in all_readings if r.bin == b]
            b_cols = [c for c in all_collection_records if c.bin == b]
            b_avg = sum(r.fill_pct for r in b_readings) / len(b_readings) if b_readings else 0
            b_max = max(r.fill_pct for r in b_readings) if b_readings else 0
            self.stdout.write(f"{b.bin_id:<15} {len(b_readings):<10} {len(b_cols):<15} {b_avg:<9.1f}% {b_max:<9.1f}% {b._base_rate:<9.2f}%/hr")
        
        self.stdout.write("\nDataset is ready for Feature Engineering! (AI-2)")
