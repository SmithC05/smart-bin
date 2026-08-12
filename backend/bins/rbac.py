from django.db.models import Q
from .models import UserProfile, Bin

def get_scoped_bins(user, queryset):
    if user.is_superuser:
        return queryset
        
    if not hasattr(user, 'profile'):
        return queryset.none()
        
    profile = user.profile
    role = profile.role

    if role in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_AUDITOR]:
        return queryset

    if role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
        q = Q()
        if profile.municipality:
            q |= Q(municipality=profile.municipality)
        if profile.legacy_zone:
            q |= Q(legacy_zone=profile.legacy_zone)
        # If neither is set, they see nothing rather than everything
        if not q: return queryset.none()
        return queryset.filter(q)

    if role in [UserProfile.ROLE_ZONE_SUPERVISOR, UserProfile.ROLE_DRIVER, UserProfile.ROLE_FIELD_WORKER]:
        q = Q()
        if profile.zone:
            q |= Q(zone=profile.zone)
        if profile.legacy_zone:
            q |= Q(legacy_zone=profile.legacy_zone)
        if not q: return queryset.none()
        return queryset.filter(q)

    return queryset.none()

def get_scoped_alerts(user, queryset):
    # Alerts are scoped by their bin
    scoped_bins = get_scoped_bins(user, Bin.objects.all())
    return queryset.filter(bin__in=scoped_bins)

def get_scoped_routes(user, queryset):
    # Routes are scoped by their bins
    scoped_bins = get_scoped_bins(user, Bin.objects.all())
    return queryset.filter(bins__in=scoped_bins).distinct()

def get_scoped_vehicles(user, queryset):
    if user.is_superuser:
        return queryset
        
    if not hasattr(user, 'profile'):
        return queryset.none()
        
    profile = user.profile
    role = profile.role

    if role in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_AUDITOR]:
        return queryset

    if role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
        if profile.municipality:
            return queryset.filter(municipality=profile.municipality)
        return queryset.none()

    if role in [UserProfile.ROLE_ZONE_SUPERVISOR]:
        if profile.zone:
            return queryset.filter(zone=profile.zone)
        return queryset.none()

    if role == UserProfile.ROLE_DRIVER:
        return queryset.filter(driver=profile)

    return queryset.none()

def get_scoped_staff(user, queryset):
    if user.is_superuser:
        return queryset
        
    if not hasattr(user, 'profile'):
        return queryset.none()
        
    profile = user.profile
    role = profile.role

    if role in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_AUDITOR]:
        return queryset

    if role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
        if profile.municipality:
            return queryset.filter(municipality=profile.municipality)
        return queryset.none()

    if role in [UserProfile.ROLE_ZONE_SUPERVISOR]:
        if profile.zone:
            return queryset.filter(zone=profile.zone)
        return queryset.none()

    if role in [UserProfile.ROLE_DRIVER, UserProfile.ROLE_FIELD_WORKER]:
        return queryset.filter(id=profile.id)

    return queryset.none()

def get_scoped_schedules(user, queryset):
    if user.is_superuser:
        return queryset
        
    if not hasattr(user, 'profile'):
        return queryset.none()
        
    profile = user.profile
    role = profile.role

    if role in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_AUDITOR]:
        return queryset

    if role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
        if profile.municipality:
            return queryset.filter(municipality=profile.municipality)
        return queryset.none()

    if role in [UserProfile.ROLE_ZONE_SUPERVISOR]:
        if profile.zone:
            return queryset.filter(zone=profile.zone)
        return queryset.none()

    if role == UserProfile.ROLE_DRIVER:
        return queryset.filter(driver=profile)

    if role == UserProfile.ROLE_FIELD_WORKER:
        return queryset.filter(workers=profile)

    return queryset.none()

def get_scoped_audit_logs(user, queryset):
    if user.is_superuser:
        return queryset
        
    if not hasattr(user, 'profile'):
        return queryset.none()
        
    profile = user.profile
    role = profile.role

    if role in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_AUDITOR]:
        return queryset

    if role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
        if profile.municipality:
            return queryset.filter(municipality=profile.municipality)
        return queryset.none()

    if role in [UserProfile.ROLE_ZONE_SUPERVISOR]:
        if profile.zone:
            return queryset.filter(zone=profile.zone)
        return queryset.none()

    # Drivers and field workers only see logs referencing themselves,
    # or perhaps we just return none if they don't have business accessing the log table.
    return queryset.none()

