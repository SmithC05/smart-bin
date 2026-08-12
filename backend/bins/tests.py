from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Municipality, Zone, Ward, UserProfile, Bin
from .rbac import get_scoped_bins

class RBACTestCase(TestCase):
    def setUp(self):
        # Create Master Data
        self.muni1 = Municipality.objects.create(name="Muni 1", code="M1")
        self.muni2 = Municipality.objects.create(name="Muni 2", code="M2")
        
        self.zone1 = Zone.objects.create(municipality=self.muni1, name="Zone 1", code="Z1")
        self.zone2 = Zone.objects.create(municipality=self.muni2, name="Zone 2", code="Z2")
        
        # Create Bins
        self.bin1 = Bin.objects.create(bin_id="B1", location="L1", lat=0, lng=0, municipality=self.muni1, zone=self.zone1)
        self.bin2 = Bin.objects.create(bin_id="B2", location="L2", lat=0, lng=0, municipality=self.muni2, zone=self.zone2)
        
        # Legacy Bins
        self.bin_legacy = Bin.objects.create(bin_id="B3", location="L3", lat=0, lng=0, legacy_zone="Z99")
        
        # Create Users
        self.sys_admin = User.objects.create_user(username="sysadmin", password="pw")
        UserProfile.objects.create(user=self.sys_admin, role=UserProfile.ROLE_SYSTEM_ADMIN)
        
        self.muni_admin = User.objects.create_user(username="muniadmin", password="pw")
        UserProfile.objects.create(user=self.muni_admin, role=UserProfile.ROLE_MUNICIPAL_ADMIN, municipality=self.muni1)
        
        self.zone_sup = User.objects.create_user(username="zonesup", password="pw")
        UserProfile.objects.create(user=self.zone_sup, role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=self.zone1)
        
        self.driver = User.objects.create_user(username="driver", password="pw")
        UserProfile.objects.create(user=self.driver, role=UserProfile.ROLE_DRIVER, legacy_zone="Z99")
        
        self.client = APIClient()

    def test_get_scoped_bins_sysadmin(self):
        bins = get_scoped_bins(self.sys_admin, Bin.objects.all())
        self.assertEqual(bins.count(), 3)
        
    def test_get_scoped_bins_muni_admin(self):
        bins = get_scoped_bins(self.muni_admin, Bin.objects.all())
        self.assertEqual(bins.count(), 1)
        self.assertEqual(bins.first(), self.bin1)
        
    def test_get_scoped_bins_zone_sup(self):
        bins = get_scoped_bins(self.zone_sup, Bin.objects.all())
        self.assertEqual(bins.count(), 1)
        self.assertEqual(bins.first(), self.bin1)
        
    def test_get_scoped_bins_legacy_driver(self):
        bins = get_scoped_bins(self.driver, Bin.objects.all())
        self.assertEqual(bins.count(), 1)
        self.assertEqual(bins.first(), self.bin_legacy)

    def test_api_access_control(self):
        self.client.force_authenticate(user=self.zone_sup)
        
        # Should be able to view municipalities (ReadOnlyOrManager)
        response = self.client.get('/api/municipalities/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should be able to view scoped bins via Dashboard
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['bins']), 1)
        self.assertEqual(response.data['bins'][0]['bin_id'], 'B1')

    def test_driver_denied_master_data_write(self):
        self.client.force_authenticate(user=self.driver)
        response = self.client.post('/api/municipalities/', {'name': 'test', 'code': 'test'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
