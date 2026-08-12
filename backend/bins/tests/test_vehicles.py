from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import UserProfile, Municipality, Zone, Depot, Vehicle

class VehicleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Master data
        self.muni1 = Municipality.objects.create(name="Muni A", code="MA")
        self.muni2 = Municipality.objects.create(name="Muni B", code="MB")
        
        self.zone1 = Zone.objects.create(municipality=self.muni1, name="Zone 1", code="Z1")
        self.zone2 = Zone.objects.create(municipality=self.muni2, name="Zone 2", code="Z2")
        
        self.depot1 = Depot.objects.create(municipality=self.muni1, zone=self.zone1, name="Depot 1", code="D1", location="", lat=0, lng=0)
        
        # Users
        self.sys_admin_user = User.objects.create_user(username='sysadmin', password='123')
        UserProfile.objects.create(user=self.sys_admin_user, role=UserProfile.ROLE_SYSTEM_ADMIN)
        
        self.muni_admin_user = User.objects.create_user(username='muniadmin', password='123')
        UserProfile.objects.create(user=self.muni_admin_user, role=UserProfile.ROLE_MUNICIPAL_ADMIN, municipality=self.muni1)
        
        self.zone_supervisor_user = User.objects.create_user(username='zonesup', password='123')
        UserProfile.objects.create(user=self.zone_supervisor_user, role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=self.zone1)
        
        self.driver_user = User.objects.create_user(username='driver', password='123')
        self.driver_profile = UserProfile.objects.create(user=self.driver_user, role=UserProfile.ROLE_DRIVER)
        
        # Vehicles
        self.v1 = Vehicle.objects.create(
            vehicle_id="V1",
            registration_number="REG1",
            capacity=10,
            municipality=self.muni1,
            zone=self.zone1,
            driver=self.driver_profile
        )
        self.v2 = Vehicle.objects.create(
            vehicle_id="V2",
            registration_number="REG2",
            capacity=5,
            municipality=self.muni2,
            zone=self.zone2
        )

    def test_vehicle_creation_sys_admin(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        payload = {
            "vehicle_id": "V3",
            "registration_number": "REG3",
            "vehicle_type": "COMPACTOR",
            "capacity": 15.5,
            "capacity_unit": "m3",
            "municipality": self.muni1.id,
            "zone": self.zone1.id,
            "depot": self.depot1.id,
            "status": "AVAILABLE"
        }
        resp = self.client.post('/api/vehicles/', payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_vehicle_validation_invalid_capacity(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        payload = {
            "vehicle_id": "V3",
            "registration_number": "REG3",
            "capacity": -5,
            "municipality": self.muni1.id
        }
        resp = self.client.post('/api/vehicles/', payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('capacity', resp.data)

    def test_vehicle_validation_mismatched_zone(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        payload = {
            "vehicle_id": "V3",
            "registration_number": "REG3",
            "capacity": 5,
            "municipality": self.muni1.id,
            "zone": self.zone2.id  # Zone 2 belongs to Muni 2
        }
        resp = self.client.post('/api/vehicles/', payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('zone', resp.data)

    def test_rbac_sys_admin_sees_all(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        resp = self.client.get('/api/vehicles/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 2)

    def test_rbac_muni_admin_sees_scoped(self):
        self.client.force_authenticate(user=self.muni_admin_user)
        resp = self.client.get('/api/vehicles/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['vehicle_id'], 'V1')

    def test_rbac_driver_sees_own(self):
        self.client.force_authenticate(user=self.driver_user)
        resp = self.client.get('/api/vehicles/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['vehicle_id'], 'V1')
