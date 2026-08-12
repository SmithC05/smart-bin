from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import UserProfile, Municipality, Zone, Ward

class StaffTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Master data
        self.muni1 = Municipality.objects.create(name="Muni A", code="MA")
        self.muni2 = Municipality.objects.create(name="Muni B", code="MB")
        
        self.zone1 = Zone.objects.create(municipality=self.muni1, name="Zone 1", code="Z1")
        self.zone2 = Zone.objects.create(municipality=self.muni2, name="Zone 2", code="Z2")

        self.ward1 = Ward.objects.create(zone=self.zone1, name="Ward 1", code="W1")
        
        # Admin user
        self.sys_admin_user = User.objects.create_user(username='sysadmin', password='123')
        self.sys_admin_profile = UserProfile.objects.create(user=self.sys_admin_user, role=UserProfile.ROLE_SYSTEM_ADMIN)
        
        # Muni admin user
        self.muni_admin_user = User.objects.create_user(username='muniadmin', password='123')
        UserProfile.objects.create(user=self.muni_admin_user, role=UserProfile.ROLE_MUNICIPAL_ADMIN, municipality=self.muni1)
        
        # Driver user
        self.driver_user = User.objects.create_user(username='driver1', password='123')
        self.driver_profile = UserProfile.objects.create(user=self.driver_user, role=UserProfile.ROLE_DRIVER, municipality=self.muni1, zone=self.zone1)

    def test_staff_creation_sys_admin(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        payload = {
            "employee_id": "EMP-001",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "designation": "Senior Driver",
            "role": "driver",
            "employment_status": "ACTIVE",
            "municipality": self.muni1.id,
            "zone": self.zone1.id
        }
        resp = self.client.post('/api/staff/', payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        # Verify user was created
        created_profile = UserProfile.objects.get(employee_id="EMP-001")
        self.assertEqual(created_profile.user.first_name, "John")
        self.assertEqual(created_profile.user.username, "EMP-001")

    def test_staff_validation_mismatched_zone(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        payload = {
            "employee_id": "EMP-002",
            "first_name": "Jane",
            "last_name": "Smith",
            "role": "driver",
            "municipality": self.muni1.id,
            "zone": self.zone2.id  # Belongs to Muni B
        }
        resp = self.client.post('/api/staff/', payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('zone', resp.data)

    def test_rbac_muni_admin_sees_scoped(self):
        self.client.force_authenticate(user=self.muni_admin_user)
        resp = self.client.get('/api/staff/')
        self.assertEqual(resp.status_code, 200)
        # Should see self (muniadmin) and driver1, but not sysadmin
        usernames = [item['username'] for item in resp.data]
        self.assertIn('muniadmin', usernames)
        self.assertIn('driver1', usernames)
        self.assertNotIn('sysadmin', usernames)

    def test_soft_deactivation(self):
        self.client.force_authenticate(user=self.sys_admin_user)
        resp = self.client.delete(f'/api/staff/{self.driver_profile.id}/')
        self.assertEqual(resp.status_code, 204)
        
        self.driver_profile.refresh_from_db()
        self.assertEqual(self.driver_profile.employment_status, UserProfile.STATUS_INACTIVE)
        
        # Test they don't show up in list endpoint anymore
        resp2 = self.client.get('/api/staff/')
        usernames = [item['username'] for item in resp2.data]
        self.assertNotIn('driver1', usernames)
