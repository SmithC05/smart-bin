from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import (
    Municipality, Zone, UserProfile, Bin, Vehicle, Depot, CollectionSchedule, CollectionRoute
)
from datetime import date, timedelta

class ScheduleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create user & auth
        self.user = User.objects.create_user(username='admin', password='password123')
        self.profile = UserProfile.objects.create(
            user=self.user,
            role=UserProfile.ROLE_SYSTEM_ADMIN
        )
        self.client.force_authenticate(user=self.user)

        # Base data
        self.municipality = Municipality.objects.create(name='City A', code='CITY-A')
        self.zone = Zone.objects.create(name='Zone 1', code='Z1', municipality=self.municipality)
        self.bin2 = Bin.objects.create(bin_id='B002', location='Loc 2', municipality=self.municipality, lat=40.1, lng=-73.1, depth_cm=100)      
        # Other municipality
        self.other_municipality = Municipality.objects.create(name='City B', code='CITY-B')
        self.other_zone = Zone.objects.create(name='Zone 2', code='Z2', municipality=self.other_municipality)
        
        # Bin
        self.bin = Bin.objects.create(
            bin_id='BIN-01',
            municipality=self.municipality,
            zone=self.zone,
            lat=10.0,
            lng=20.0
        )
        
        # Vehicle
        self.vehicle = Vehicle.objects.create(
            vehicle_id='VEH-01',
            registration_number='REG-01',
            vehicle_type=Vehicle.TYPE_COMPACTOR,
            municipality=self.municipality,
            status=Vehicle.STATUS_AVAILABLE,
            capacity=10.0
        )

        # Depot
        self.depot = Depot.objects.create(
            code='D1',
            name='Central Depot',
            municipality=self.municipality,
            lat=10.1,
            lng=20.1
        )
        
        # Driver
        self.driver_user = User.objects.create_user(username='driver1')
        self.driver = UserProfile.objects.create(
            user=self.driver_user,
            role=UserProfile.ROLE_DRIVER,
            employment_status='ACTIVE'
        )

        # Worker
        self.worker_user = User.objects.create_user(username='worker1')
        self.worker = UserProfile.objects.create(
            user=self.worker_user,
            role=UserProfile.ROLE_FIELD_WORKER,
            employment_status='ACTIVE'
        )

    def test_create_draft_schedule(self):
        data = {
            'schedule_id': 'SCH-001',
            'date': date.today().isoformat(),
            'municipality': self.municipality.id,
            'zone': self.zone.id,
            'vehicle': self.vehicle.id,
            'driver': self.driver.id,
            'depot': self.depot.id,
            'bins': [self.bin.id],
            'workers': [self.worker.id]
        }
        response = self.client.post('/api/schedules/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], CollectionSchedule.STATUS_DRAFT)

    def test_invalid_zone_scope(self):
        data = {
            'schedule_id': 'SCH-002',
            'date': date.today().isoformat(),
            'municipality': self.municipality.id,
            'zone': self.other_zone.id,  # Invalid zone
            'bins': [self.bin.id]
        }
        response = self.client.post('/api/schedules/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('zone', response.data)

    def test_plan_schedule(self):
        schedule = CollectionSchedule.objects.create(
            schedule_id='SCH-003',
            date=date.today(),
            municipality=self.municipality,
            zone=self.zone,
            depot=self.depot
        )
        schedule.bins.add(self.bin)

        response = self.client.post(f'/api/schedules/{schedule.id}/plan/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, CollectionSchedule.STATUS_PLANNED)

    def test_dispatch_schedule(self):
        self.depot = Depot.objects.create(
            name='Test Depot',
            municipality=self.municipality,
            lat=40.0,
            lng=-73.0
        )
        
        self.schedule = CollectionSchedule.objects.create(
            schedule_id='SCH-TEST-001',
            date=date.today(),
            municipality=self.municipality,
            zone=self.zone,
            status=CollectionSchedule.STATUS_PLANNED,
            vehicle=self.vehicle,
            driver=self.driver,
            depot=self.depot
        )
        self.schedule.bins.add(self.bin)
        
        response = self.client.post(f'/api/schedules/{self.schedule.id}/dispatch/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.status, CollectionSchedule.STATUS_DISPATCHED)
        
        # Check if route was created
        route = CollectionRoute.objects.filter(schedule=self.schedule).first()
        self.assertIsNotNone(route)
        self.assertEqual(route.status, CollectionRoute.STATUS_DISPATCHED)
        
        # Check route metrics
        self.assertIsNotNone(route.total_distance_km)
        self.assertIn('method', route.optimization_metadata)
        
        # Check vehicle status
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, Vehicle.STATUS_ASSIGNED)

    def test_rbac_zone_supervisor(self):
        supervisor_user = User.objects.create_user(username='supervisor')
        supervisor_profile = UserProfile.objects.create(
            user=supervisor_user,
            role=UserProfile.ROLE_ZONE_SUPERVISOR,
            zone=self.zone
        )
        
        # Create schedules in zone 1 and zone 2
        CollectionSchedule.objects.create(
            schedule_id='SCH-Z1', date=date.today(), municipality=self.municipality, zone=self.zone
        )
        CollectionSchedule.objects.create(
            schedule_id='SCH-Z2', date=date.today(), municipality=self.other_municipality, zone=self.other_zone
        )
        
        self.client.force_authenticate(user=supervisor_user)
        response = self.client.get('/api/schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['schedule_id'], 'SCH-Z1')
