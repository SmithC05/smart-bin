from django.utils import timezone
from rest_framework import serializers
from .models import (
    Alert,
    AppSetting,
    UserProfile,
    Bin,
    BinReading,
    CollectionRoute,
    Municipality,
    Zone,
    Ward,
    Depot,
    ProcessingFacility,
    Vehicle,
    CollectionSchedule,
    CollectionRecord,
    AuditLog,
    Notification
)
from django.contrib.auth.models import User

class MunicipalitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Municipality
        fields = '__all__'

class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = '__all__'

class DepotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Depot
        fields = '__all__'

class ProcessingFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessingFacility
        fields = '__all__'


class VehicleSerializer(serializers.ModelSerializer):
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    depot_name = serializers.CharField(source='depot.name', read_only=True)
    driver_name = serializers.CharField(source='driver.user.username', read_only=True)

    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Capacity must be positive.")
        return value

    def validate(self, data):
        municipality = data.get('municipality')
        zone = data.get('zone')
        depot = data.get('depot')

        if zone and zone.municipality != municipality:
            raise serializers.ValidationError({"zone": "Zone must belong to the selected municipality."})
        
        if depot and depot.municipality != municipality:
            raise serializers.ValidationError({"depot": "Depot must belong to the selected municipality."})
            
        if depot and depot.zone and zone and depot.zone != zone:
            raise serializers.ValidationError({"depot": "Depot zone does not match the vehicle's zone."})

        # Scope Validation against the requesting user
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            profile = request.user.profile
            if profile.role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only assign vehicles to your municipality."})
            elif profile.role == UserProfile.ROLE_ZONE_SUPERVISOR:
                if profile.zone and zone != profile.zone:
                    raise serializers.ValidationError({"zone": "You can only assign vehicles to your zone."})
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only assign vehicles to your municipality."})

        return data

class StaffSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    
    username = serializers.CharField(source='user.username', read_only=True)
    name = serializers.SerializerMethodField(read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    ward_name = serializers.CharField(source='ward.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'employee_id', 'designation', 'role', 'employment_status',
            'phone', 'date_of_joining', 'legacy_zone',
            'municipality', 'zone', 'ward',
            'first_name', 'last_name', 'email',
            'username', 'name', 'user_email',
            'municipality_name', 'zone_name', 'ward_name'
        ]

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def validate(self, data):
        municipality = data.get('municipality')
        zone = data.get('zone')
        ward = data.get('ward')
        role = data.get('role')

        if zone and zone.municipality != municipality:
            raise serializers.ValidationError({"zone": "Zone must belong to the selected municipality."})
        
        if ward and ward.zone != zone:
            raise serializers.ValidationError({"ward": "Ward must belong to the selected zone."})

        # Scope and Role Validation against the requesting user
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            profile = request.user.profile
            
            # Privilege escalation prevention
            if role in [UserProfile.ROLE_SYSTEM_ADMIN]:
                if profile.role != UserProfile.ROLE_SYSTEM_ADMIN:
                    raise serializers.ValidationError({"role": "You do not have permission to assign this role."})
            elif role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_AUDITOR]:
                if profile.role not in [UserProfile.ROLE_SYSTEM_ADMIN, UserProfile.ROLE_MUNICIPAL_ADMIN]:
                    raise serializers.ValidationError({"role": "You do not have permission to assign this role."})

            if profile.role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only assign staff to your municipality."})
            elif profile.role == UserProfile.ROLE_ZONE_SUPERVISOR:
                if profile.zone and zone != profile.zone:
                    raise serializers.ValidationError({"zone": "You can only assign staff to your zone."})
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only assign staff to your municipality."})

        return data

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        email = validated_data.pop('email', '')
        
        # Generate a username (fallback to a random one if employee_id isn't provided)
        import uuid
        employee_id = validated_data.get('employee_id')
        username = employee_id if employee_id else str(uuid.uuid4())[:8]
        
        # Ensure username is unique
        if User.objects.filter(username=username).exists():
            username = f"{username}_{str(uuid.uuid4())[:4]}"

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        user.set_unusable_password()
        user.save()

        profile = UserProfile.objects.create(user=user, **validated_data)
        return profile

    def update(self, instance, validated_data):
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        email = validated_data.pop('email', None)

        if first_name is not None:
            instance.user.first_name = first_name
        if last_name is not None:
            instance.user.last_name = last_name
        if email is not None:
            instance.user.email = email
            
        instance.user.save()
        return super().update(instance, validated_data)


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
            'ward', 'municipality', 'data_source'
        ]
        read_only_fields = ['id', 'created_at', 'latest_pct', 'status', 'last_seen', 'open_alert_id']
        extra_kwargs = {'device_api_key': {'write_only': True}}

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
    records = serializers.SerializerMethodField()

    class Meta:
        model = CollectionRoute
        fields = [
            'id', 'name', 'status', 'bins', 'bin_ids', 'optimized_order',
            'total_distance_km', 'estimated_duration_min', 'travel_time_available',
            'optimization_metadata', 'start_location', 'end_location',
            'dispatched_at', 'completed_at', 'created_at', 'schedule', 'records'
        ]
        read_only_fields = [
            'id', 'status', 'bins', 'optimized_order',
            'total_distance_km', 'estimated_duration_min', 'travel_time_available',
            'optimization_metadata', 'start_location', 'end_location',
            'dispatched_at', 'completed_at', 'created_at',
        ]

    def get_records(self, obj):
        records = CollectionRecord.objects.filter(route=obj)
        record_map = {r.bin.bin_id: r for r in records}
        ordered_records = []
        if obj.optimized_order:
            for stop in obj.optimized_order:
                if stop.get('type') == 'BIN':
                    bin_id = stop.get('bin_id')
                    if bin_id in record_map:
                        ordered_records.append(CollectionRecordSerializer(record_map[bin_id]).data)
            missing = [CollectionRecordSerializer(r).data for r in records if r.bin.bin_id not in [s.get('bin_id') for s in obj.optimized_order if s.get('type') == 'BIN']]
            return ordered_records + missing
        return [CollectionRecordSerializer(r).data for r in records]


class CollectionScheduleSerializer(serializers.ModelSerializer):
    municipality_name = serializers.CharField(source='municipality.name', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    ward_name = serializers.CharField(source='ward.name', read_only=True)
    vehicle_registration = serializers.CharField(source='vehicle.registration_number', read_only=True)
    driver_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = CollectionSchedule
        fields = [
            'id', 'schedule_id', 'date', 'status', 'priority',
            'municipality', 'zone', 'ward',
            'municipality_name', 'zone_name', 'ward_name',
            'vehicle', 'vehicle_registration',
            'driver', 'driver_name',
            'workers', 'bins', 'depot', 'processing_facility',
            'notes', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'status']

    def get_driver_name(self, obj):
        if obj.driver:
            return f"{obj.driver.user.first_name} {obj.driver.user.last_name}".strip() or obj.driver.user.username
        return None

    def validate(self, data):
        municipality = data.get('municipality')
        zone = data.get('zone')
        ward = data.get('ward')
        vehicle = data.get('vehicle')
        depot = data.get('depot')
        driver = data.get('driver')

        if zone and zone.municipality != municipality:
            raise serializers.ValidationError({"zone": "Zone must belong to the selected municipality."})
        
        if ward and ward.zone != zone:
            raise serializers.ValidationError({"ward": "Ward must belong to the selected zone."})

        if vehicle:
            if vehicle.municipality != municipality:
                raise serializers.ValidationError({"vehicle": "Vehicle must belong to the selected municipality."})
            if vehicle.status in [Vehicle.STATUS_MAINTENANCE, Vehicle.STATUS_INACTIVE]:
                raise serializers.ValidationError({"vehicle": "Vehicle is not available for assignment."})

        if depot and depot.municipality != municipality:
            raise serializers.ValidationError({"depot": "Depot must belong to the selected municipality."})

        if driver and driver.employment_status != 'ACTIVE':
            raise serializers.ValidationError({"driver": "Assigned driver must be active."})

        # Scope Validation against the requesting user
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile'):
            profile = request.user.profile
            if profile.role in [UserProfile.ROLE_MUNICIPAL_ADMIN, UserProfile.ROLE_MUNICIPAL_OFFICER]:
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only create schedules for your municipality."})
            elif profile.role == UserProfile.ROLE_ZONE_SUPERVISOR:
                if profile.zone and zone != profile.zone:
                    raise serializers.ValidationError({"zone": "You can only create schedules for your zone."})
                if profile.municipality and municipality != profile.municipality:
                    raise serializers.ValidationError({"municipality": "You can only create schedules for your municipality."})

        return data
class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = ['key', 'value', 'updated_at']
        read_only_fields = ['updated_at']

class CollectionRecordSerializer(serializers.ModelSerializer):
    bin_id = serializers.CharField(source='bin.bin_id', read_only=True)
    location = serializers.CharField(source='bin.location', read_only=True)
    lat = serializers.FloatField(source='bin.lat', read_only=True)
    lng = serializers.FloatField(source='bin.lng', read_only=True)

    class Meta:
        model = CollectionRecord
        fields = [
            'id', 'schedule', 'route', 'bin', 'bin_id', 'location', 'lat', 'lng',
            'status', 'collected_by', 'arrived_at', 'collected_at',
            'exception_reason', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'schedule', 'route', 'bin', 'bin_id', 'location', 'lat', 'lng',
            'collected_by', 'arrived_at', 'collected_at', 'created_at', 'updated_at'
        ]

class DriverRouteDetailSerializer(serializers.ModelSerializer):
    records = serializers.SerializerMethodField()
    schedule_details = CollectionScheduleSerializer(source='schedule', read_only=True)

    class Meta:
        model = CollectionRoute
        fields = [
            'id', 'name', 'status', 'optimized_order',
            'total_distance_km', 'estimated_duration_min', 'travel_time_available',
            'start_location', 'end_location', 'schedule_details', 'records'
        ]

    def get_records(self, obj):
        # Only return records belonging to this specific route
        records = CollectionRecord.objects.filter(route=obj)
        # Order them to match optimized_order if possible
        record_map = {r.bin.bin_id: r for r in records}
        ordered_records = []
        for stop in obj.optimized_order:
            if stop.get('type') == 'BIN':
                bin_id = stop.get('bin_id')
                if bin_id in record_map:
                    ordered_records.append(CollectionRecordSerializer(record_map[bin_id]).data)
        
        # Add any records that weren't in the optimized order at the end
        missing = [CollectionRecordSerializer(r).data for r in records if r.bin.bin_id not in [s.get('bin_id') for s in obj.optimized_order if s.get('type') == 'BIN']]
        return ordered_records + missing

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(read_only=True)
    username = serializers.CharField(source='user.user.username', read_only=True, default=None)
    municipality_name = serializers.CharField(source='municipality.name', read_only=True, default=None)
    zone_name = serializers.CharField(source='zone.name', read_only=True, default=None)
    
    class Meta:
        model = AuditLog
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
