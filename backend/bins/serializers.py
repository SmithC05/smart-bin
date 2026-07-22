from django.utils import timezone
from rest_framework import serializers

from .models import Alert, AppSetting, Bin, BinReading, CollectionRoute


class BinReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BinReading
        fields = ['id', 'bin', 'fill_pct', 'distance_cm', 'recorded_at']
        read_only_fields = ['id', 'fill_pct', 'recorded_at']


class BinSerializer(serializers.ModelSerializer):
    latest_pct = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    last_seen = serializers.SerializerMethodField()
    open_alert_id = serializers.SerializerMethodField()

    class Meta:
        model = Bin
        fields = [
            'id', 'bin_id', 'location', 'zone', 'lat', 'lng',
            'depth_cm', 'alert_threshold_pct', 'route_threshold_pct',
            'device_api_key', 'is_active', 'created_at',
            'latest_pct', 'status', 'last_seen', 'open_alert_id',
        ]
        read_only_fields = ['id', 'created_at', 'latest_pct', 'status', 'last_seen', 'open_alert_id']

    def _latest_reading(self, obj):
        return obj.readings.first()

    def _latest_pct(self, obj):
        reading = self._latest_reading(obj)
        return reading.fill_pct if reading else 0.0

    def get_latest_pct(self, obj):
        return self._latest_pct(obj)

    def get_status(self, obj):
        reading = self._latest_reading(obj)
        if not reading:
            return 'offline'

        age_seconds = (timezone.now() - reading.recorded_at).total_seconds()
        stale_minutes = float(AppSetting.get_value('offline_after_minutes', '5'))
        if age_seconds > stale_minutes * 60:
            return 'offline'

        pct = reading.fill_pct
        if pct >= obj.alert_threshold_pct:
            return 'full'
        if pct >= obj.route_threshold_pct:
            return 'high'
        return 'ok'

    def get_last_seen(self, obj):
        reading = self._latest_reading(obj)
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

    def get_open_alert_id(self, obj):
        alert = obj.alerts.filter(status__in=[Alert.STATUS_OPEN, Alert.STATUS_ACKNOWLEDGED]).first()
        return alert.id if alert else None


class BinDetailSerializer(BinSerializer):
    recent_readings = serializers.SerializerMethodField()

    class Meta(BinSerializer.Meta):
        fields = BinSerializer.Meta.fields + ['recent_readings']

    def get_recent_readings(self, obj):
        qs = obj.readings.all()[:20]
        return BinReadingSerializer(qs, many=True).data


class AlertSerializer(serializers.ModelSerializer):
    bin_id = serializers.CharField(source='bin.bin_id', read_only=True)
    location = serializers.CharField(source='bin.location', read_only=True)

    class Meta:
        model = Alert
        fields = [
            'id', 'bin', 'bin_id', 'location', 'reading', 'fill_pct',
            'level', 'status', 'message', 'acknowledged_at', 'resolved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'bin', 'bin_id', 'location', 'reading', 'fill_pct',
            'level', 'message', 'acknowledged_at', 'resolved_at',
            'created_at', 'updated_at',
        ]


class RouteSerializer(serializers.ModelSerializer):
    bins = BinSerializer(many=True, read_only=True)
    bin_ids = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

    class Meta:
        model = CollectionRoute
        fields = [
            'id', 'name', 'status', 'bins', 'bin_ids', 'optimized_order',
            'dispatched_at', 'completed_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'status', 'bins', 'optimized_order',
            'dispatched_at', 'completed_at', 'created_at',
        ]


class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = ['key', 'value', 'updated_at']
        read_only_fields = ['updated_at']
