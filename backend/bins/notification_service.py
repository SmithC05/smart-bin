import datetime
from django.utils import timezone
from .models import Notification, UserProfile, User, Bin, CollectionSchedule, Vehicle, CollectionRoute

class NotificationService:
    @staticmethod
    def create_notification(recipients, notification_type, title, message, severity=Notification.SEVERITY_INFO, related_object_type="", related_object_id="", deduplicate_hours=0):
        """
        Creates a notification for the given recipients, ensuring no duplicates within `deduplicate_hours`.
        """
        if not recipients:
            return

        now = timezone.now()
        created_count = 0
        
        for recipient_user in recipients:
            # Deduplication
            if deduplicate_hours > 0:
                time_threshold = now - datetime.timedelta(hours=deduplicate_hours)
                existing = Notification.objects.filter(
                    recipient=recipient_user,
                    notification_type=notification_type,
                    related_object_type=related_object_type,
                    related_object_id=str(related_object_id),
                    created_at__gte=time_threshold
                ).exists()
                
                if existing:
                    continue # Skip creating a duplicate

            Notification.objects.create(
                recipient=recipient_user,
                notification_type=notification_type,
                title=title,
                message=message,
                severity=severity,
                related_object_type=related_object_type,
                related_object_id=str(related_object_id)
            )
            created_count += 1
            
        return created_count

    @staticmethod
    def notify_smartbin_critical(bin_obj, fill_pct):
        """Notify relevant zone supervisor about critical bin."""
        if not bin_obj.zone:
            return
        
        supervisors = UserProfile.objects.filter(
            role=UserProfile.ROLE_ZONE_SUPERVISOR, 
            zone=bin_obj.zone
        ).select_related('user')
        
        recipients = [p.user for p in supervisors]
        
        NotificationService.create_notification(
            recipients=recipients,
            notification_type=Notification.TYPE_SMARTBIN_CRITICAL,
            title="Critical SmartBin Alert",
            message=f"{bin_obj.bin_id} has reached {fill_pct:.1f}% fill level. Zone {bin_obj.zone.code} requires attention.",
            severity=Notification.SEVERITY_CRITICAL,
            related_object_type="Bin",
            related_object_id=bin_obj.id,
            deduplicate_hours=12  # As per the plan, 12 hours for critical deduplication
        )

    @staticmethod
    def notify_schedule_dispatched(schedule):
        recipients = []
        if schedule.driver and schedule.driver.user:
            recipients.append(schedule.driver.user)
        
        for worker in schedule.workers.all():
            if worker.user:
                recipients.append(worker.user)
                
        NotificationService.create_notification(
            recipients=recipients,
            notification_type=Notification.TYPE_SCHEDULE_DISPATCHED,
            title=f"Collection Schedule Dispatched",
            message=f"Schedule {schedule.schedule_id} dispatched for Zone {schedule.zone.code if schedule.zone else 'Unknown'}.",
            severity=Notification.SEVERITY_HIGH,
            related_object_type="CollectionSchedule",
            related_object_id=schedule.id,
            deduplicate_hours=0
        )

    @staticmethod
    def notify_schedule_cancelled(schedule):
        recipients = []
        if schedule.driver and schedule.driver.user:
            recipients.append(schedule.driver.user)
            
        # Also notify zone supervisor
        if schedule.zone:
            supervisors = UserProfile.objects.filter(role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=schedule.zone)
            recipients.extend([p.user for p in supervisors])
            
        NotificationService.create_notification(
            recipients=list(set(recipients)),
            notification_type=Notification.TYPE_SCHEDULE_CANCELLED,
            title=f"Schedule Cancelled",
            message=f"Schedule {schedule.schedule_id} has been cancelled.",
            severity=Notification.SEVERITY_WARNING,
            related_object_type="CollectionSchedule",
            related_object_id=schedule.id,
            deduplicate_hours=0
        )

    @staticmethod
    def notify_route_started(route):
        if not route.schedule or not route.schedule.zone:
            return
        supervisors = UserProfile.objects.filter(role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=route.schedule.zone)
        recipients = [p.user for p in supervisors]
        
        NotificationService.create_notification(
            recipients=recipients,
            notification_type=Notification.TYPE_ROUTE_STARTED,
            title="Route Started",
            message=f"Route {route.name} has been started.",
            severity=Notification.SEVERITY_INFO,
            related_object_type="CollectionRoute",
            related_object_id=route.id,
            deduplicate_hours=0
        )

    @staticmethod
    def notify_route_completed(route):
        if not route.schedule or not route.schedule.zone:
            return
        supervisors = UserProfile.objects.filter(role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=route.schedule.zone)
        recipients = [p.user for p in supervisors]
        
        NotificationService.create_notification(
            recipients=recipients,
            notification_type=Notification.TYPE_ROUTE_COMPLETED,
            title="Route Completed",
            message=f"Route {route.name} has been completed.",
            severity=Notification.SEVERITY_INFO,
            related_object_type="CollectionRoute",
            related_object_id=route.id,
            deduplicate_hours=0
        )

    @staticmethod
    def notify_collection_exception(record):
        recipients = []
        if record.schedule and record.schedule.zone:
            supervisors = UserProfile.objects.filter(role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=record.schedule.zone)
            recipients.extend([p.user for p in supervisors])
            
        driver_name = record.collected_by.user.get_full_name() if record.collected_by and record.collected_by.user else "Unknown Driver"
        zone_code = record.schedule.zone.code if record.schedule and record.schedule.zone else "Unknown"

        NotificationService.create_notification(
            recipients=recipients,
            notification_type=Notification.TYPE_COLLECTION_EXCEPTION,
            title="Collection Exception",
            message=f"BIN {record.bin.bin_id} could not be collected.\nReason: {record.exception_reason}\nDriver: {driver_name}\nZone: {zone_code}",
            severity=Notification.SEVERITY_WARNING,
            related_object_type="CollectionRecord",
            related_object_id=record.id,
            deduplicate_hours=1 # Deduplicate repeated attempts in a short time
        )

    @staticmethod
    def notify_vehicle_maintenance(vehicle):
        recipients = []
        if vehicle.zone:
            supervisors = UserProfile.objects.filter(role=UserProfile.ROLE_ZONE_SUPERVISOR, zone=vehicle.zone)
            recipients.extend([p.user for p in supervisors])
            
        if vehicle.municipality:
            officers = UserProfile.objects.filter(role=UserProfile.ROLE_MUNICIPAL_OFFICER, municipality=vehicle.municipality)
            recipients.extend([p.user for p in officers])
            
        if vehicle.driver and vehicle.driver.user:
            recipients.append(vehicle.driver.user)
            
        NotificationService.create_notification(
            recipients=list(set(recipients)),
            notification_type=Notification.TYPE_VEHICLE_MAINTENANCE,
            title="Vehicle in Maintenance",
            message=f"Vehicle {vehicle.vehicle_id} ({vehicle.registration_number}) has been placed into maintenance.",
            severity=Notification.SEVERITY_WARNING,
            related_object_type="Vehicle",
            related_object_id=vehicle.id,
            deduplicate_hours=0
        )

notification_service = NotificationService()
