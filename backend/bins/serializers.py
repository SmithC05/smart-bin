# bins/serializers.py
from django.utils import timezone
from rest_framework import serializers
from .models import Bin, BinReading


class BinReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinReading
        fields = ['id', 'bin', 'fill_pct', 'distance_cm', 'recorded_at']


class BinSerializer(serializers.ModelSerializer):
    latest_pct = serializers.SerializerMethodField()
    status     = serializers.SerializerMethodField()
    last_seen  = serializers.SerializerMethodField()

    class Meta:
        model = Bin
        fields = [
            'id', 'bin_id', 'location', 'zone',
            'lat', 'lng', 'is_active', 'created_at',
            'latest_pct', 'status', 'last_seen',
        ]

    def _latest_pct(self, obj):
        """Return fill_pct of the most recent reading, or 0 if none."""
        reading = obj.readings.first()   # ordered by -recorded_at
        return reading.fill_pct if reading else 0.0

    def get_latest_pct(self, obj):
        return self._latest_pct(obj)

    def get_status(self, obj):
        pct = self._latest_pct(obj)
        if pct >= 80:
            return 'full'
        if pct >= 60:
            return 'high'
        return 'ok'

    def get_last_seen(self, obj):
        reading = obj.readings.first()
        if not reading:
            return 'Never'

        diff = int((timezone.now() - reading.recorded_at).total_seconds())
        if diff < 60:
            return 'Just now'
        if diff < 3600:
            return f'{diff // 60} min ago'
        if diff < 86400:
            return f'{diff // 3600} hr ago'
        return f'{diff // 86400} days ago'


class BinDetailSerializer(BinSerializer):
    """BinSerializer + last 20 readings (for sparkline history)."""
    recent_readings = serializers.SerializerMethodField()

    class Meta(BinSerializer.Meta):
        fields = BinSerializer.Meta.fields + ['recent_readings']

    def get_recent_readings(self, obj):
        qs = obj.readings.all()[:20]
        return BinReadingSerializer(qs, many=True).data
