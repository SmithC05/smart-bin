# bins/models.py
from django.db import models


class Bin(models.Model):
    bin_id     = models.CharField(max_length=20, unique=True)
    location   = models.CharField(max_length=100)
    zone       = models.CharField(max_length=5)
    lat        = models.FloatField()
    lng        = models.FloatField()
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['bin_id']

    def __str__(self):
        return f"{self.bin_id} – {self.location}"


class BinReading(models.Model):
    bin         = models.ForeignKey(Bin, on_delete=models.CASCADE, related_name='readings')
    fill_pct    = models.FloatField()          # 0.0 – 100.0, computed server-side
    distance_cm = models.FloatField()          # raw HC-SR04 reading
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"{self.bin.bin_id} @ {self.recorded_at:%Y-%m-%d %H:%M} – {self.fill_pct:.1f}%"
