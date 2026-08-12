from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
import os
from unittest.mock import patch
from bins.models import (
    Municipality, Zone, Ward, UserProfile, Bin, 
    Vehicle, Depot, ProcessingFacility, CollectionSchedule, 
    CollectionRoute, BinReading, Alert
)

class DemoGeneratorTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.admin_user = User.objects.create_user(username='admin', password='password123')
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user,
            role=UserProfile.ROLE_SYSTEM_ADMIN
        )
        
        self.driver_user = User.objects.create_user(username='driver_real', password='password123')
        self.driver_profile = UserProfile.objects.create(
            user=self.driver_user,
            role=UserProfile.ROLE_DRIVER
        )
        
        # Real bin that should be protected
        self.real_muni = Municipality.objects.create(name='Real City', code='REAL-CITY')
        self.real_bin = Bin.objects.create(
            bin_id='BIN-REAL-001', location='Main St', municipality=self.real_muni,
            lat=10.0, lng=20.0, data_source=Bin.DATA_SOURCE_REAL, device_api_key='secret_key'
        )
        self.real_reading = BinReading.objects.create(
            bin=self.real_bin, fill_pct=50, distance_cm=50
        )

    @patch.dict(os.environ, {'ENABLE_SIMULATOR': 'True'})
    def test_demo_generation_success(self):
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.post('/api/demo/generate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify counts
        self.assertEqual(Municipality.objects.filter(is_demo=True).count(), 1)
        self.assertEqual(Zone.objects.filter(is_demo=True).count(), 3)
        self.assertEqual(Ward.objects.filter(is_demo=True).count(), 5)
        self.assertEqual(Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).count(), 10)
        self.assertEqual(Vehicle.objects.filter(is_demo=True).count(), 3)
        self.assertEqual(UserProfile.objects.filter(is_demo=True).count(), 8)
        self.assertEqual(CollectionSchedule.objects.filter(is_demo=True).count(), 3)
        
        # Verify real hardware protection
        self.real_bin.refresh_from_db()
        self.assertEqual(self.real_bin.data_source, Bin.DATA_SOURCE_REAL)
        self.assertEqual(self.real_bin.device_api_key, 'secret_key')
        self.assertEqual(Bin.objects.filter(data_source=Bin.DATA_SOURCE_REAL).count(), 1)

    @patch.dict(os.environ, {'ENABLE_SIMULATOR': 'True'})
    def test_demo_idempotency(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # First generate
        response1 = self.client.post('/api/demo/generate/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # Second generate
        response2 = self.client.post('/api/demo/generate/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['status'], 'already_exists')
        
        # Count should still be the same
        self.assertEqual(Municipality.objects.filter(is_demo=True).count(), 1)

    @patch.dict(os.environ, {'ENABLE_SIMULATOR': 'False'})
    def test_demo_generator_disabled(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/demo/generate/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch.dict(os.environ, {'ENABLE_SIMULATOR': 'True'})
    def test_demo_generator_rbac(self):
        # Driver should not be able to generate demo data
        self.client.force_authenticate(user=self.driver_user)
        response = self.client.post('/api/demo/generate/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch.dict(os.environ, {'ENABLE_SIMULATOR': 'True'})
    def test_demo_reset(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # Generate
        self.client.post('/api/demo/generate/')
        self.assertTrue(Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).exists())
        self.assertTrue(UserProfile.objects.filter(is_demo=True).exists())
        
        # Reset
        response = self.client.delete('/api/demo/reset/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertFalse(Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).exists())
        self.assertFalse(UserProfile.objects.filter(is_demo=True).exists())
        self.assertFalse(Municipality.objects.filter(is_demo=True).exists())
        
        # Verify real hardware protection
        self.assertTrue(Bin.objects.filter(data_source=Bin.DATA_SOURCE_REAL).exists())
