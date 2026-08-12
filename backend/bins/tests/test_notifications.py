from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import Notification, Municipality, Zone, UserProfile, Bin, BinReading
from bins.notification_service import notification_service

class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.municipality = Municipality.objects.create(name='Test Muni', code='TM')
        self.zone = Zone.objects.create(municipality=self.municipality, name='Test Zone', code='TZ')
        
        # System Admin
        self.admin_user = User.objects.create_user(username='admin', password='password')
        self.admin_profile = UserProfile.objects.create(user=self.admin_user, role=UserProfile.ROLE_SYSTEM_ADMIN)
        
        # Zone Supervisor
        self.sup_user = User.objects.create_user(username='sup', password='password')
        self.sup_profile = UserProfile.objects.create(user=self.sup_user, role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=self.zone)
        
        # Another Zone Supervisor
        self.zone2 = Zone.objects.create(municipality=self.municipality, name='Other Zone', code='OZ')
        self.sup2_user = User.objects.create_user(username='sup2', password='password')
        self.sup2_profile = UserProfile.objects.create(user=self.sup2_user, role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=self.zone2)

        self.bin = Bin.objects.create(bin_id='BIN-001', municipality=self.municipality, zone=self.zone, lat=0, lng=0, alert_threshold_pct=90)

    def test_smartbin_critical_notification(self):
        # Notify SmartBin Critical
        notification_service.notify_smartbin_critical(self.bin, 95.0)
        
        # Supervisor of self.zone should get it
        self.assertTrue(Notification.objects.filter(recipient=self.sup_user).exists())
        
        # Supervisor of self.zone2 should NOT get it
        self.assertFalse(Notification.objects.filter(recipient=self.sup2_user).exists())
        
        notif = Notification.objects.get(recipient=self.sup_user)
        self.assertEqual(notif.notification_type, Notification.TYPE_SMARTBIN_CRITICAL)
        self.assertIn("95.0%", notif.message)

    def test_deduplication(self):
        # Create first time
        notification_service.notify_smartbin_critical(self.bin, 95.0)
        self.assertEqual(Notification.objects.filter(recipient=self.sup_user).count(), 1)
        
        # Second time should be deduplicated (within 12 hours)
        notification_service.notify_smartbin_critical(self.bin, 96.0)
        self.assertEqual(Notification.objects.filter(recipient=self.sup_user).count(), 1)

    def test_api_read_all(self):
        # Give sup user some notifications
        Notification.objects.create(recipient=self.sup_user, notification_type=Notification.TYPE_ALERT_CREATED, title='T1', message='M1')
        Notification.objects.create(recipient=self.sup_user, notification_type=Notification.TYPE_ALERT_CREATED, title='T2', message='M2')
        
        self.client.force_authenticate(user=self.sup_user)
        
        resp = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(resp.data['count'], 2)
        
        resp = self.client.post('/api/notifications/read-all/')
        self.assertEqual(resp.data['count'], 2)
        
        resp = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(resp.data['count'], 0)
