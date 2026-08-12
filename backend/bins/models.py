from django.db import models
from django.contrib.auth.models import User

class Municipality(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Zone(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='zones')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Ward(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='wards')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=20, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Depot(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=200)
    lat = models.FloatField()
    lng = models.FloatField()
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='depots')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='depots')
    status = models.CharField(max_length=20, default='active')
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class ProcessingFacility(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    facility_type = models.CharField(max_length=50)
    location = models.CharField(max_length=200)
    lat = models.FloatField()
    lng = models.FloatField()
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='facilities')
    status = models.CharField(max_length=20, default='active')
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class UserProfile(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    ROLE_SYSTEM_ADMIN = 'system_admin'
    ROLE_MUNICIPAL_ADMIN = 'municipal_admin'
    ROLE_MUNICIPAL_OFFICER = 'municipal_officer'
    ROLE_ZONE_SUPERVISOR = 'zone_supervisor'
    ROLE_DRIVER = 'driver'
    ROLE_FIELD_WORKER = 'field_worker'
    ROLE_AUDITOR = 'auditor'
    
    ROLE_CHOICES = [
        (ROLE_SYSTEM_ADMIN, 'System Admin'),
        (ROLE_MUNICIPAL_ADMIN, 'Municipal Admin'),
        (ROLE_MUNICIPAL_OFFICER, 'Municipal Officer'),
        (ROLE_ZONE_SUPERVISOR, 'Zone Supervisor'),
        (ROLE_DRIVER, 'Driver'),
        (ROLE_FIELD_WORKER, 'Field Worker'),
        (ROLE_AUDITOR, 'Auditor'),
    ]

    STATUS_ACTIVE = 'ACTIVE'
    STATUS_INACTIVE = 'INACTIVE'
    STATUS_ON_LEAVE = 'ON_LEAVE'
    STATUS_SUSPENDED = 'SUSPENDED'
    
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_ON_LEAVE, 'On Leave'),
        (STATUS_SUSPENDED, 'Suspended'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_DRIVER)
    legacy_zone = models.CharField(max_length=5, blank=True, help_text="Legacy zone string")

    # Workforce Information
    employee_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    employment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    designation = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)

    # Geographic Scope
    municipality = models.ForeignKey(Municipality, on_delete=models.SET_NULL, null=True, blank=True)
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True)
    ward = models.ForeignKey(Ward, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Vehicle(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    TYPE_COMPACTOR = 'COMPACTOR'
    TYPE_TIPPER = 'TIPPER'
    TYPE_MINI_TRUCK = 'MINI_TRUCK'
    TYPE_TRACTOR = 'TRACTOR'
    TYPE_OTHER = 'OTHER'
    TYPE_CHOICES = [
        (TYPE_COMPACTOR, 'Compactor'),
        (TYPE_TIPPER, 'Tipper'),
        (TYPE_MINI_TRUCK, 'Mini Truck'),
        (TYPE_TRACTOR, 'Tractor'),
        (TYPE_OTHER, 'Other'),
    ]

    UNIT_M3 = 'm3'
    UNIT_KG = 'kg'
    UNIT_TONS = 'tons'
    UNIT_CHOICES = [
        (UNIT_M3, 'm³'),
        (UNIT_KG, 'kg'),
        (UNIT_TONS, 'Tons'),
    ]

    STATUS_AVAILABLE = 'AVAILABLE'
    STATUS_ASSIGNED = 'ASSIGNED'
    STATUS_ON_ROUTE = 'ON_ROUTE'
    STATUS_MAINTENANCE = 'MAINTENANCE'
    STATUS_INACTIVE = 'INACTIVE'
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_ON_ROUTE, 'On Route'),
        (STATUS_MAINTENANCE, 'Maintenance'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    vehicle_id = models.CharField(max_length=20, unique=True)
    registration_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_COMPACTOR)
    capacity = models.FloatField()
    capacity_unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default=UNIT_M3)
    
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='vehicles')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    depot = models.ForeignKey(Depot, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    
    driver = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': UserProfile.ROLE_DRIVER}, related_name='vehicles')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['vehicle_id']

    def __str__(self):
        return f'{self.vehicle_id} - {self.registration_number}'


class Bin(models.Model):
    DATA_SOURCE_REAL = 'REAL'
    DATA_SOURCE_SIMULATED = 'SIMULATED'
    DATA_SOURCE_CHOICES = [
        (DATA_SOURCE_REAL, 'Real Device'),
        (DATA_SOURCE_SIMULATED, 'Simulated'),
    ]
    data_source = models.CharField(max_length=20, choices=DATA_SOURCE_CHOICES, default=DATA_SOURCE_REAL, db_index=True)
    
    bin_id = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=100)
    legacy_zone = models.CharField(max_length=5, blank=True)
    municipality = models.ForeignKey(Municipality, on_delete=models.SET_NULL, null=True, blank=True, related_name='bins')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='bins')
    ward = models.ForeignKey(Ward, on_delete=models.SET_NULL, null=True, blank=True, related_name='bins')
    lat = models.FloatField()
    lng = models.FloatField()
    depth_cm = models.FloatField(default=40.0)
    alert_threshold_pct = models.FloatField(default=80.0)
    route_threshold_pct = models.FloatField(default=60.0)
    device_api_key = models.CharField(max_length=80, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['bin_id']

    def __str__(self):
        return f'{self.bin_id} - {self.location}'


class BinReading(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    bin = models.ForeignKey(Bin, on_delete=models.CASCADE, related_name='readings')
    fill_pct = models.FloatField()
    distance_cm = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f'{self.bin.bin_id} @ {self.recorded_at:%Y-%m-%d %H:%M} - {self.fill_pct:.1f}%'


class Alert(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    LEVEL_DANGER = 'danger'
    LEVEL_WARNING = 'warning'
    LEVEL_CHOICES = [
        (LEVEL_DANGER, 'Danger'),
        (LEVEL_WARNING, 'Warning'),
    ]

    STATUS_OPEN = 'open'
    STATUS_ACKNOWLEDGED = 'acknowledged'
    STATUS_RESOLVED = 'resolved'
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_ACKNOWLEDGED, 'Acknowledged'),
        (STATUS_RESOLVED, 'Resolved'),
    ]

    bin = models.ForeignKey(Bin, on_delete=models.CASCADE, related_name='alerts')
    reading = models.ForeignKey(
        BinReading,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts',
    )
    fill_pct = models.FloatField()
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_DANGER)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    message = models.CharField(max_length=200)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.bin.bin_id} {self.status} alert at {self.fill_pct:.1f}%'


class CollectionSchedule(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    STATUS_DRAFT = 'DRAFT'
    STATUS_PLANNED = 'PLANNED'
    STATUS_DISPATCHED = 'DISPATCHED'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PLANNED, 'Planned'),
        (STATUS_DISPATCHED, 'Dispatched'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    PRIORITY_NORMAL = 'NORMAL'
    PRIORITY_HIGH = 'HIGH'
    PRIORITY_CRITICAL = 'CRITICAL'
    
    PRIORITY_CHOICES = [
        (PRIORITY_NORMAL, 'Normal'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_CRITICAL, 'Critical'),
    ]

    schedule_id = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL)

    # Geographic Scope
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE, related_name='schedules')
    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name='schedules')
    ward = models.ForeignKey(Ward, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')

    # Assignments
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')
    driver = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': UserProfile.ROLE_DRIVER}, related_name='driven_schedules')
    workers = models.ManyToManyField(UserProfile, limit_choices_to={'role': UserProfile.ROLE_FIELD_WORKER}, blank=True, related_name='worked_schedules')
    
    # Bins & Locations
    bins = models.ManyToManyField(Bin, related_name='schedules')
    depot = models.ForeignKey(Depot, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')
    processing_facility = models.ForeignKey(ProcessingFacility, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules')
    
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_schedules')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.schedule_id} - {self.date}'


class CollectionRoute(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    STATUS_PLANNED = 'planned'
    STATUS_DISPATCHED = 'dispatched'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PLANNED, 'Planned'),
        (STATUS_DISPATCHED, 'Dispatched'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    name = models.CharField(max_length=80)
    schedule = models.ForeignKey(CollectionSchedule, on_delete=models.CASCADE, related_name='routes', null=True, blank=True)
    bins = models.ManyToManyField(Bin, related_name='routes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    optimized_order = models.JSONField(default=list, blank=True)
    
    # Route Metrics
    total_distance_km = models.FloatField(null=True, blank=True)
    estimated_duration_min = models.FloatField(null=True, blank=True)
    travel_time_available = models.BooleanField(default=False)
    optimization_metadata = models.JSONField(default=dict, blank=True)
    start_location = models.CharField(max_length=100, null=True, blank=True)
    end_location = models.CharField(max_length=100, null=True, blank=True)
    
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'


class CollectionRecord(models.Model):
    is_demo = models.BooleanField(default=False, db_index=True)
    STATUS_PENDING = 'PENDING'
    STATUS_ARRIVED = 'ARRIVED'
    STATUS_COLLECTED = 'COLLECTED'
    STATUS_UNABLE_TO_COLLECT = 'UNABLE_TO_COLLECT'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ARRIVED, 'Arrived'),
        (STATUS_COLLECTED, 'Collected'),
        (STATUS_UNABLE_TO_COLLECT, 'Unable to Collect'),
    ]

    schedule = models.ForeignKey(CollectionSchedule, on_delete=models.CASCADE, related_name='records')
    route = models.ForeignKey(CollectionRoute, on_delete=models.CASCADE, related_name='records')
    bin = models.ForeignKey(Bin, on_delete=models.CASCADE, related_name='collection_records')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    
    collected_by = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='collections_performed')
    
    arrived_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    
    exception_reason = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('schedule', 'bin')

    def __str__(self):
        return f'Record {self.id}: {self.bin.bin_id} ({self.status})'


class AppSetting(models.Model):
    key = models.CharField(max_length=60, unique=True)
    value = models.CharField(max_length=200)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']

    @classmethod
    def get_value(cls, key, default):
        setting = cls.objects.filter(key=key).first()
        return setting.value if setting else default

    def __str__(self):
        return f'{self.key}={self.value}'

class AuditLog(models.Model):
    # Core Identification
    id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Actor Context
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, help_text="The user who performed the action")
    actor_name = models.CharField(max_length=255, default='SYSTEM', help_text="Name of the actor, useful for automated actions without a user")
    role = models.CharField(max_length=50, blank=True, help_text="Role of the user at the time of the action")

    # Action Context
    ACTION_CHOICES = [
        ('AUTH_LOGIN', 'Auth Login'),
        ('AUTH_LOGOUT', 'Auth Logout'),
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('USER_DEACTIVATED', 'User Deactivated'),
        ('BIN_CREATED', 'Bin Created'),
        ('BIN_UPDATED', 'Bin Updated'),
        ('BIN_DELETED', 'Bin Deleted'),
        ('ALERT_ACKNOWLEDGED', 'Alert Acknowledged'),
        ('ALERT_RESOLVED', 'Alert Resolved'),
        ('VEHICLE_CREATED', 'Vehicle Created'),
        ('VEHICLE_UPDATED', 'Vehicle Updated'),
        ('VEHICLE_DEACTIVATED', 'Vehicle Deactivated'),
        ('STAFF_CREATED', 'Staff Created'),
        ('STAFF_UPDATED', 'Staff Updated'),
        ('STAFF_DEACTIVATED', 'Staff Deactivated'),
        ('SCHEDULE_CREATED', 'Schedule Created'),
        ('SCHEDULE_UPDATED', 'Schedule Updated'),
        ('SCHEDULE_PLANNED', 'Schedule Planned'),
        ('SCHEDULE_DISPATCHED', 'Schedule Dispatched'),
        ('SCHEDULE_CANCELLED', 'Schedule Cancelled'),
        ('ROUTE_GENERATED', 'Route Generated'),
        ('ROUTE_REGENERATED', 'Route Regenerated'),
        ('ROUTE_STARTED', 'Route Started'),
        ('ROUTE_COMPLETED', 'Route Completed'),
        ('COLLECTION_RECORDED', 'Collection Recorded'),
        ('COLLECTION_EXCEPTION', 'Collection Exception'),
    ]
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    module = models.CharField(max_length=100, db_index=True)
    
    # Object Context
    record_id = models.CharField(max_length=100, help_text="Identifier of the affected business object", db_index=True)
    
    # Scope Context
    municipality = models.ForeignKey(Municipality, on_delete=models.SET_NULL, null=True, blank=True)
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Details
    changes = models.JSONField(null=True, blank=True, help_text="Before and after state of changes")

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} - {self.actor_name} - {self.action} on {self.record_id}"

class Notification(models.Model):
    SEVERITY_INFO = 'INFO'
    SEVERITY_WARNING = 'WARNING'
    SEVERITY_HIGH = 'HIGH'
    SEVERITY_CRITICAL = 'CRITICAL'
    SEVERITY_CHOICES = [
        (SEVERITY_INFO, 'Info'),
        (SEVERITY_WARNING, 'Warning'),
        (SEVERITY_HIGH, 'High'),
        (SEVERITY_CRITICAL, 'Critical'),
    ]

    TYPE_SMARTBIN_CRITICAL = 'SMARTBIN_CRITICAL'
    TYPE_ALERT_CREATED = 'ALERT_CREATED'
    TYPE_SCHEDULE_DISPATCHED = 'SCHEDULE_DISPATCHED'
    TYPE_SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED'
    TYPE_ROUTE_STARTED = 'ROUTE_STARTED'
    TYPE_ROUTE_COMPLETED = 'ROUTE_COMPLETED'
    TYPE_COLLECTION_EXCEPTION = 'COLLECTION_EXCEPTION'
    TYPE_VEHICLE_MAINTENANCE = 'VEHICLE_MAINTENANCE'
    TYPE_CHOICES = [
        (TYPE_SMARTBIN_CRITICAL, 'SmartBin Critical'),
        (TYPE_ALERT_CREATED, 'Alert Created'),
        (TYPE_SCHEDULE_DISPATCHED, 'Schedule Dispatched'),
        (TYPE_SCHEDULE_CANCELLED, 'Schedule Cancelled'),
        (TYPE_ROUTE_STARTED, 'Route Started'),
        (TYPE_ROUTE_COMPLETED, 'Route Completed'),
        (TYPE_COLLECTION_EXCEPTION, 'Collection Exception'),
        (TYPE_VEHICLE_MAINTENANCE, 'Vehicle Maintenance'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', db_index=True)
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_INFO)
    
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.CharField(max_length=50, blank=True)
    
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.username} - {self.title} ({'Read' if self.is_read else 'Unread'})"
