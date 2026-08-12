from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from bins.models import AuditLog, UserProfile, Municipality, Zone, Vehicle

class AuditLogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create user and profile
        self.user = User.objects.create_user(username='admin', password='password')
        self.muni = Municipality.objects.create(name='Test Muni', code='TM-01')
        self.zone = Zone.objects.create(name='Test Zone', code='TZ-01', municipality=self.muni)
        
        self.profile = UserProfile.objects.create(
            user=self.user,
            role=UserProfile.ROLE_SYSTEM_ADMIN,
            employee_id='EMP-001',
            municipality=self.muni,
            zone=self.zone
        )
        
        # Create auditor user
        self.auditor_user = User.objects.create_user(username='auditor', password='password')
        self.auditor_profile = UserProfile.objects.create(
            user=self.auditor_user,
            role=UserProfile.ROLE_AUDITOR
        )
        
        # Create regular driver
        self.driver_user = User.objects.create_user(username='driver', password='password')
        self.driver_profile = UserProfile.objects.create(
            user=self.driver_user,
            role=UserProfile.ROLE_DRIVER,
            municipality=self.muni,
            zone=self.zone
        )

    def test_audit_log_created_on_vehicle_create(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/vehicles/', {
            'vehicle_id': 'VEH-001',
            'registration_number': 'AB1234',
            'vehicle_type': 'COMPACTOR',
            'capacity': 10,
            'capacity_unit': 'tons',
            'municipality': self.muni.id,
            'zone': self.zone.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify audit log
        logs = AuditLog.objects.filter(action='VEHICLE_CREATED')
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.user.id, self.profile.id)
        self.assertEqual(log.record_id, 'VEH-001')
        self.assertEqual(log.module, 'Vehicles')

    def test_audit_logs_rbac_system_admin(self):
        AuditLog.objects.create(action='TEST', module='TEST', record_id='1', municipality=self.muni, zone=self.zone)
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
    def test_audit_logs_rbac_driver_denied(self):
        AuditLog.objects.create(action='TEST', module='TEST', record_id='1', municipality=self.muni, zone=self.zone)
        
        self.client.force_authenticate(user=self.driver_user)
        response = self.client.get('/api/audit-logs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Drivers should not see logs
        self.assertEqual(len(response.data['results']), 0)

    def test_audit_logs_immutability(self):
        log = AuditLog.objects.create(action='TEST', module='TEST', record_id='1')
        
        self.client.force_authenticate(user=self.user)
        
        # Cannot POST
        response = self.client.post('/api/audit-logs/', {'action': 'FAKE'})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Cannot PUT
        response = self.client.put(f'/api/audit-logs/{log.id}/', {'action': 'FAKE'})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Cannot DELETE
        response = self.client.delete(f'/api/audit-logs/{log.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
