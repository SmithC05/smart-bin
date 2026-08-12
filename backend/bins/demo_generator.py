import datetime
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Municipality, Zone, Ward, Depot, ProcessingFacility,
    UserProfile, Vehicle, Bin, BinReading, Alert, CollectionSchedule,
    CollectionRoute, CollectionRecord, AuditLog
)

class DemoDataService:
    @staticmethod
    @transaction.atomic
    def generate_demo_dataset(request_user):
        """Generates a complete, consistent demo dataset."""
        if Municipality.objects.filter(is_demo=True).exists():
            return {"status": "already_exists", "message": "Demo dataset already exists."}

        # 1. Municipality
        muni = Municipality.objects.create(name='Demo Municipality', code='DEMO-MUNI', is_demo=True)
        
        # 2. Zones
        z1 = Zone.objects.create(name='North Zone', code='DEMO-Z1', municipality=muni, is_demo=True)
        z2 = Zone.objects.create(name='South Zone', code='DEMO-Z2', municipality=muni, is_demo=True)
        z3 = Zone.objects.create(name='East Zone', code='DEMO-Z3', municipality=muni, is_demo=True)

        # 3. Wards
        Ward.objects.create(name='Ward 1A', code='DEMO-W1A', zone=z1, is_demo=True)
        w1b = Ward.objects.create(name='Ward 1B', code='DEMO-W1B', zone=z1, is_demo=True)
        Ward.objects.create(name='Ward 2A', code='DEMO-W2A', zone=z2, is_demo=True)
        Ward.objects.create(name='Ward 2B', code='DEMO-W2B', zone=z2, is_demo=True)
        Ward.objects.create(name='Ward 3A', code='DEMO-W3A', zone=z3, is_demo=True)

        # 4. Depot & Processing Facility
        depot = Depot.objects.create(
            name='Central Demo Depot', code='DEMO-DEPOT', location='Central Industrial Area',
            lat=40.7128, lng=-74.0060, municipality=muni, zone=z1, is_demo=True
        )
        facility = ProcessingFacility.objects.create(
            name='Municipal Demo Processing Facility', code='DEMO-PROC', facility_type='Recycling Center',
            location='Outskirts', lat=40.7500, lng=-73.9800, municipality=muni, is_demo=True
        )

        # 5. SmartBins (Simulated)
        bins = []
        fill_levels = [92, 84, 71, 58, 46, 89, 32, 76, 18, 95]
        for i in range(1, 11):
            bin_obj = Bin.objects.create(
                bin_id=f'BIN-SIM-{i:03d}', location=f'Demo Street {i}', municipality=muni, zone=z1, ward=w1b,
                lat=40.7128 + (i * 0.001), lng=-74.0060 + (i * 0.001), depth_cm=100.0,
                alert_threshold_pct=80.0, route_threshold_pct=60.0,
                data_source=Bin.DATA_SOURCE_SIMULATED
            )
            bins.append(bin_obj)
            
            # Simulated Readings
            BinReading.objects.create(bin=bin_obj, fill_pct=fill_levels[i-1], distance_cm=100 - fill_levels[i-1], is_demo=True)
            
            if fill_levels[i-1] >= 80:
                Alert.objects.create(
                    bin=bin_obj, fill_pct=fill_levels[i-1], level=Alert.LEVEL_DANGER,
                    status=Alert.STATUS_OPEN, message='Critical fill level detected.', is_demo=True
                )

        # 6. Vehicles
        v1 = Vehicle.objects.create(
            vehicle_id='VEH-SIM-001', registration_number='SIM-1001', vehicle_type=Vehicle.TYPE_COMPACTOR,
            capacity=10.0, municipality=muni, depot=depot, is_demo=True
        )
        Vehicle.objects.create(
            vehicle_id='VEH-SIM-002', registration_number='SIM-1002', vehicle_type=Vehicle.TYPE_TIPPER,
            capacity=5.0, municipality=muni, depot=depot, is_demo=True
        )
        Vehicle.objects.create(
            vehicle_id='VEH-SIM-003', registration_number='SIM-1003', vehicle_type=Vehicle.TYPE_MINI_TRUCK,
            capacity=3.0, municipality=muni, depot=depot, is_demo=True
        )

        # 7. Staff
        # Create administrative test accounts
        admin_roles = {
            'sysadmin': UserProfile.ROLE_SYSTEM_ADMIN,
            'municipaladmin': UserProfile.ROLE_MUNICIPAL_ADMIN,
            'officer': UserProfile.ROLE_MUNICIPAL_OFFICER,
            'zonesupervisor': UserProfile.ROLE_ZONE_SUPERVISOR,
            'auditor': UserProfile.ROLE_AUDITOR
        }
        
        for username, role in admin_roles.items():
            user, _ = User.objects.get_or_create(username=username)
            user.set_password('demo123')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(
                user=user, defaults={'role': role, 'is_demo': True}
            )
            profile.role = role # In case it exists
            
            if role != UserProfile.ROLE_SYSTEM_ADMIN:
                profile.municipality = muni
            if role == UserProfile.ROLE_ZONE_SUPERVISOR:
                profile.zone = z1
                
            profile.is_demo = True
            profile.save()

        # Create drivers and workers
        driver_users = []
        for i in range(1, 4):
            username = f'driver0{i}'
            user, _ = User.objects.get_or_create(username=username)
            user.set_password('demo123')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(
                user=user, defaults={'role': UserProfile.ROLE_DRIVER, 'is_demo': True}
            )
            profile.municipality = muni
            profile.zone = z1
            profile.is_demo = True
            profile.save()
            driver_users.append(profile)
            
        worker_users = []
        for i in range(1, 6):
            username = f'worker0{i}'
            user, _ = User.objects.get_or_create(username=username)
            user.set_password('demo123')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(
                user=user, defaults={'role': UserProfile.ROLE_FIELD_WORKER, 'is_demo': True}
            )
            profile.municipality = muni
            profile.zone = z1
            profile.is_demo = True
            profile.save()
            worker_users.append(profile)

        # 8. Schedules
        s1 = CollectionSchedule.objects.create(
            schedule_id='SCH-SIM-001', date=timezone.now().date(), status=CollectionSchedule.STATUS_PLANNED,
            municipality=muni, zone=z1, vehicle=v1, driver=driver_users[0], depot=depot, is_demo=True
        )
        s1.bins.add(*bins[:4])
        s1.workers.add(*worker_users[:2])

        s2 = CollectionSchedule.objects.create(
            schedule_id='SCH-SIM-002', date=timezone.now().date(), status=CollectionSchedule.STATUS_DISPATCHED,
            municipality=muni, zone=z1, vehicle=v1, driver=driver_users[1], depot=depot, is_demo=True
        )
        s2.bins.add(*bins[4:8])
        s2.workers.add(*worker_users[2:4])
        
        # Create route for dispatched schedule
        r2 = CollectionRoute.objects.create(
            name='Demo Dispatched Route', schedule=s2, status=CollectionRoute.STATUS_DISPATCHED,
            total_distance_km=15.5, estimated_duration_min=45, is_demo=True
        )
        r2.bins.add(*bins[4:8])

        s3 = CollectionSchedule.objects.create(
            schedule_id='SCH-SIM-003', date=timezone.now().date() + datetime.timedelta(days=1), status=CollectionSchedule.STATUS_DRAFT,
            municipality=muni, zone=z1, depot=depot, is_demo=True
        )
        s3.bins.add(*bins[8:])

        # Audit
        AuditLog.objects.create(
            user=request_user,
            actor_name=request_user.user.username if request_user else 'SYSTEM',
            role=request_user.role if request_user else '',
            action='DEMO_DATA_GENERATED',
            module='DEMO_GENERATOR',
            record_id='MULTIPLE',
            changes={"generated_records": {"bins": 10, "municipalities": 1}}
        )

        return {
            "status": "created",
            "municipalities": 1,
            "zones": 3,
            "wards": 5,
            "simulated_bins": 10,
            "vehicles": 3,
            "drivers": 3,
            "workers": 5,
            "schedules": 3
        }

    @staticmethod
    @transaction.atomic
    def reset_demo_dataset(request_user):
        """Safely deletes only simulated data."""
        # Django CASCADE handles most models gracefully. 
        # But users must be handled separately since UserProfile -> User is not CASCADE from UserProfile.
        demo_profiles = UserProfile.objects.filter(is_demo=True)
        demo_user_ids = list(demo_profiles.values_list('user_id', flat=True))
        
        Municipality.objects.filter(is_demo=True).delete()
        Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).delete()
        
        # Delete demo users
        User.objects.filter(id__in=demo_user_ids).delete()

        AuditLog.objects.create(
            user=request_user,
            actor_name=request_user.user.username if request_user else 'SYSTEM',
            role=request_user.role if request_user else '',
            action='DEMO_DATA_RESET',
            module='DEMO_GENERATOR',
            record_id='MULTIPLE',
            changes={"action": "deleted demo dataset"}
        )

        return {"status": "deleted"}
