from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import UserProfile

class BaseRolePermission(BasePermission):
    allowed_roles = []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role in self.allowed_roles
        except UserProfile.DoesNotExist:
            return False

class IsSystemAdmin(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_SYSTEM_ADMIN]

class IsMunicipalAdmin(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_MUNICIPAL_ADMIN]

class IsMunicipalOfficer(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]

class IsZoneSupervisor(BaseRolePermission):
    allowed_roles = [
        UserProfile.ROLE_SYSTEM_ADMIN, 
        UserProfile.ROLE_MUNICIPAL_ADMIN, 
        UserProfile.ROLE_MUNICIPAL_OFFICER, 
        UserProfile.ROLE_ZONE_SUPERVISOR
    ]

class IsDriver(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_DRIVER]

class IsFieldWorker(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_FIELD_WORKER]

class IsAuditor(BaseRolePermission):
    allowed_roles = [UserProfile.ROLE_AUDITOR]

class IsManagerOrCollector(BaseRolePermission):
    allowed_roles = [
        UserProfile.ROLE_SYSTEM_ADMIN,
        UserProfile.ROLE_MUNICIPAL_ADMIN,
        UserProfile.ROLE_MUNICIPAL_OFFICER,
        UserProfile.ROLE_ZONE_SUPERVISOR
    ]

class ReadOnlyOrManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_superuser:
            return True
        try:
            return request.user.profile.role in [
                UserProfile.ROLE_SYSTEM_ADMIN,
                UserProfile.ROLE_MUNICIPAL_ADMIN,
                UserProfile.ROLE_MUNICIPAL_OFFICER,
                UserProfile.ROLE_ZONE_SUPERVISOR
            ]
        except UserProfile.DoesNotExist:
            return False

class IsDriverOrWorkerAssigned(BasePermission):
    """
    Object-level permission to ensure a Driver or Field Worker is assigned 
    to the schedule, route, or record.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
            
        if request.user.is_superuser:
            return True
            
        try:
            profile = request.user.profile
            role = profile.role
        except UserProfile.DoesNotExist:
            return False
            
        # Admins can do anything
        if role in [
            UserProfile.ROLE_SYSTEM_ADMIN,
            UserProfile.ROLE_MUNICIPAL_ADMIN,
            UserProfile.ROLE_MUNICIPAL_OFFICER,
            UserProfile.ROLE_ZONE_SUPERVISOR
        ]:
            return True

        if role == UserProfile.ROLE_DRIVER:
            if hasattr(obj, 'driver'): # Schedule
                return obj.driver == profile
            if hasattr(obj, 'schedule'): # Route or Record
                return obj.schedule.driver == profile
                
        if role == UserProfile.ROLE_FIELD_WORKER:
            if hasattr(obj, 'workers'):
                return profile in obj.workers.all()
            if hasattr(obj, 'schedule'):
                return profile in obj.schedule.workers.all()

        return False
