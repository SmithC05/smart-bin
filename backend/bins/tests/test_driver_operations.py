from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from datetime import date
from ..models import (
    Municipality, Zone, UserProfile, Bin, Vehicle, 
    CollectionSchedule, CollectionRoute, CollectionRecord
)

class DriverOperationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client_b = APIClient()
        
        self.municipality = Municipality.objects.create(name='Test Municipality', code='TM-01')
        self.zone = Zone.objects.create(name='Zone A', code='ZA-01', municipality=self.municipality)
        
        # Driver A
        self.user_a = User.objects.create_user(username='driver_a', password='password123')
        self.profile_a = UserProfile.objects.create(
            user=self.user_a, role=UserProfile.ROLE_DRIVER, employee_id='DRV-01',
            municipality=self.municipality, zone=self.zone, employment_status='ACTIVE'
        )
        
        # Driver B
        self.user_b = User.objects.create_user(username='driver_b', password='password123')
        self.profile_b = UserProfile.objects.create(
            user=self.user_b, role=UserProfile.ROLE_DRIVER, employee_id='DRV-02',
            municipality=self.municipality, zone=self.zone, employment_status='ACTIVE'
        )
        
        self.bin1 = Bin.objects.create(bin_id='BIN-1', location='Loc 1', lat=1.0, lng=1.0, municipality=self.municipality, zone=self.zone)
        self.bin2 = Bin.objects.create(bin_id='BIN-2', location='Loc 2', lat=2.0, lng=2.0, municipality=self.municipality, zone=self.zone)
        
        # Create a dispatched schedule for Driver A
        self.schedule = CollectionSchedule.objects.create(
            schedule_id='SCH-001',
            date=date.today(),
            municipality=self.municipality,
            zone=self.zone,
            driver=self.profile_a,
            status=CollectionSchedule.STATUS_DISPATCHED
        )
        self.schedule.bins.add(self.bin1, self.bin2)
        
        self.route = CollectionRoute.objects.create(
            name='Test Route',
            schedule=self.schedule,
            status=CollectionRoute.STATUS_DISPATCHED,
            optimized_order=[
                {'type': 'BIN', 'bin_id': self.bin1.bin_id},
                {'type': 'BIN', 'bin_id': self.bin2.bin_id}
            ]
        )
        self.route.bins.add(self.bin1, self.bin2)

    def test_list_driver_schedules(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/driver/schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['schedule_id'], 'SCH-001')
        
        # Driver B shouldn't see it
        self.client_b.force_authenticate(user=self.user_b)
        response_b = self.client_b.get('/api/driver/schedules/')
        self.assertEqual(response_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_b.data), 0)

    def test_start_route(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(f'/api/driver/{self.schedule.id}/start/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.schedule.refresh_from_db()
        self.route.refresh_from_db()
        self.assertEqual(self.schedule.status, CollectionSchedule.STATUS_IN_PROGRESS)
        self.assertEqual(self.route.status, CollectionRoute.STATUS_IN_PROGRESS)
        
        # Check generated records
        records = CollectionRecord.objects.filter(schedule=self.schedule)
        self.assertEqual(records.count(), 2)
        self.assertTrue(all(r.status == CollectionRecord.STATUS_PENDING for r in records))

    def test_start_route_forbidden_driver_b(self):
        self.client_b.force_authenticate(user=self.user_b)
        response = self.client_b.post(f'/api/driver/{self.schedule.id}/start/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_collection_flow(self):
        # Start the route
        self.client.force_authenticate(user=self.user_a)
        self.client.post(f'/api/driver/{self.schedule.id}/start/')
        
        record1 = CollectionRecord.objects.get(bin=self.bin1)
        record2 = CollectionRecord.objects.get(bin=self.bin2)
        
        # Arrive at bin 1
        res = self.client.post(f'/api/driver/records/{record1.id}/arrive/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        record1.refresh_from_db()
        self.assertEqual(record1.status, CollectionRecord.STATUS_ARRIVED)
        
        # Collect bin 1
        res = self.client.post(f'/api/driver/records/{record1.id}/collect/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        record1.refresh_from_db()
        self.assertEqual(record1.status, CollectionRecord.STATUS_COLLECTED)
        
        # Driver B tries to arrive at bin 2 (Forbidden)
        self.client_b.force_authenticate(user=self.user_b)
        res_b = self.client_b.post(f'/api/driver/records/{record2.id}/arrive/')
        self.assertEqual(res_b.status_code, status.HTTP_403_FORBIDDEN)
        
        # Driver A reports exception for bin 2
        res = self.client.post(f'/api/driver/records/{record2.id}/exception/', {'reason': 'ACCESS_BLOCKED', 'notes': 'Gate locked'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        record2.refresh_from_db()
        self.assertEqual(record2.status, CollectionRecord.STATUS_UNABLE_TO_COLLECT)
        self.assertEqual(record2.exception_reason, 'ACCESS_BLOCKED')
        
        # Complete route
        res = self.client.post(f'/api/driver/{self.schedule.id}/complete-route/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.status, CollectionSchedule.STATUS_COMPLETED)

    def test_complete_route_fails_if_pending(self):
        self.client.force_authenticate(user=self.user_a)
        self.client.post(f'/api/driver/{self.schedule.id}/start/')
        
        # Try to complete without finishing records
        res = self.client.post(f'/api/driver/{self.schedule.id}/complete-route/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot complete route', res.data['error'])
