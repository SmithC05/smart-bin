from django.db import models


class Bin(models.Model):
    bin_id = models.CharField(max_length=20, unique=True)
    location = models.CharField(max_length=100)
    zone = models.CharField(max_length=5)
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
    bin = models.ForeignKey(Bin, on_delete=models.CASCADE, related_name='readings')
    fill_pct = models.FloatField()
    distance_cm = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f'{self.bin.bin_id} @ {self.recorded_at:%Y-%m-%d %H:%M} - {self.fill_pct:.1f}%'


class Alert(models.Model):
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


class CollectionRoute(models.Model):
    STATUS_PLANNED = 'planned'
    STATUS_DISPATCHED = 'dispatched'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PLANNED, 'Planned'),
        (STATUS_DISPATCHED, 'Dispatched'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    name = models.CharField(max_length=80)
    bins = models.ManyToManyField(Bin, related_name='routes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PLANNED)
    optimized_order = models.JSONField(default=list, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'


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
