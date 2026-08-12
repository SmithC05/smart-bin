from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import UserProfile, Municipality, Zone, CollectionSchedule

class ReportsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.muni = Municipality.objects.create(name='Test City', code='TC')
        self.zone = Zone.objects.create(name='Test Zone', code='TZ', municipality=self.muni)
        
        self.sysadmin_user = User.objects.create_user(username='sysadmin', password='password')
        self.sysadmin_profile = UserProfile.objects.create(
            user=self.sysadmin_user, 
            role=UserProfile.ROLE_SYSTEM_ADMIN
        )

        self.driver_user = User.objects.create_user(username='driver', password='password')
        self.driver_profile = UserProfile.objects.create(
            user=self.driver_user, 
            role=UserProfile.ROLE_DRIVER
        )
        
        CollectionSchedule.objects.create(
            schedule_id='SCH-001',
            date='2026-08-12',
            status=CollectionSchedule.STATUS_COMPLETED,
            municipality=self.muni,
            zone=self.zone
        )

    def test_overview_sysadmin(self):
        self.client.force_authenticate(user=self.sysadmin_user)
        response = self.client.get('/api/reports/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['schedules']['total'], 1)

    def test_overview_driver(self):
        self.client.force_authenticate(user=self.driver_user)
        response = self.client.get('/api/reports/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['schedules']['total'], 0) # Driver not assigned to schedule

    def test_csv_export(self):
        self.client.force_authenticate(user=self.sysadmin_user)
        response = self.client.get('/api/reports/overview/?export=csv')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')
