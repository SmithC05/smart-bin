import random

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import viewsets
import os

from .models import Alert, AppSetting, Bin, BinReading, CollectionRoute, CollectionSchedule, CollectionRecord, UserProfile, Municipality, Zone, Ward, Depot, ProcessingFacility, Vehicle, AuditLog
from .serializers import (
    AlertSerializer,
    AppSettingSerializer,
    BinDetailSerializer,
    BinDetailSerializer,
    BinSerializer,
    RouteSerializer,
    MunicipalitySerializer, ZoneSerializer, WardSerializer, DepotSerializer, ProcessingFacilitySerializer,
    VehicleSerializer, StaffSerializer,
    CollectionScheduleSerializer,
    DriverRouteDetailSerializer, CollectionRecordSerializer, AuditLogSerializer
)
from .notification_service import notification_service
from .permissions import IsSystemAdmin, IsMunicipalAdmin, IsMunicipalOfficer, IsZoneSupervisor, IsDriver, IsManagerOrCollector, ReadOnlyOrManager, IsDriverOrWorkerAssigned
from .rbac import get_scoped_bins, get_scoped_alerts, get_scoped_routes, get_scoped_vehicles, get_scoped_staff, get_scoped_schedules, get_scoped_audit_logs
from bins.services import audit_service
from .demo_generator import DemoDataService

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.profile
            role = profile.role
            zone = profile.zone
        except UserProfile.DoesNotExist:
            role = None
            zone = ''

        return Response({
            'username': user.username,
            'email': user.email,
            'role': role,
            'zone': zone
        })


DEFAULT_SETTINGS = {
    'organisation_name': 'SmartBin Demo',
    'timezone': 'UTC+05:30',
    'offline_after_minutes': '5',
    'notification_email': 'ops@example.com',
}


def _compute_fill_pct(bin_obj, distance_cm):
    return max(0.0, min(100.0, (1 - distance_cm / bin_obj.depth_cm) * 100))


def _distance_from_fill(bin_obj, fill_pct):
    return round((1 - fill_pct / 100) * bin_obj.depth_cm, 2)


def _status_for(bin_obj, fill_pct):
    if fill_pct >= bin_obj.alert_threshold_pct:
        return 'full'
    if fill_pct >= bin_obj.route_threshold_pct:
        return 'high'
    return 'ok'


def _broadcast_update(bin_obj, reading):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'bin_updates',
        {
            'type': 'bin.update',
            'data': {
                'bin_id': bin_obj.bin_id,
                'location': bin_obj.location,
                'zone': bin_obj.zone,
                'fill_pct': reading.fill_pct,
                'distance_cm': reading.distance_cm,
                'recorded_at': reading.recorded_at.isoformat(),
                'status': _status_for(bin_obj, reading.fill_pct),
                'last_seen': 'Just now',
            },
        },
    )


def _sync_alert_for_reading(bin_obj, reading):
    active_alerts = bin_obj.alerts.filter(status__in=[Alert.STATUS_OPEN, Alert.STATUS_ACKNOWLEDGED])

    if reading.fill_pct >= bin_obj.alert_threshold_pct:
        alert = active_alerts.first()
        if alert:
            alert.fill_pct = reading.fill_pct
            alert.reading = reading
            alert.message = f'{bin_obj.bin_id} reached {reading.fill_pct:.1f}% fill level.'
            alert.status = Alert.STATUS_OPEN
            alert.save()
            notification_service.notify_smartbin_critical(bin_obj, reading.fill_pct)
            return alert

        alert = Alert.objects.create(
            bin=bin_obj,
            reading=reading,
            fill_pct=reading.fill_pct,
            level=Alert.LEVEL_DANGER,
            message=f'{bin_obj.bin_id} reached {reading.fill_pct:.1f}% fill level.',
        )
        notification_service.notify_smartbin_critical(bin_obj, reading.fill_pct)
        return alert

    for alert in active_alerts:
        alert.status = Alert.STATUS_RESOLVED
        alert.resolved_at = timezone.now()
        alert.save()

    return None


class BinListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base_qs = Bin.objects.filter(is_active=True).prefetch_related('readings', 'alerts')
        bins = get_scoped_bins(request.user, base_qs)
        
        serializer = BinSerializer(bins, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not IsManagerOrCollector().has_permission(request, self):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = BinSerializer(data=request.data)
        if serializer.is_valid():
            bin_obj = serializer.save()
            return Response(BinSerializer(bin_obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BinDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bin_id):
        bin_obj = get_object_or_404(Bin.objects.prefetch_related('readings', 'alerts'), bin_id=bin_id)
        return Response(BinDetailSerializer(bin_obj).data)

    def patch(self, request, bin_id):
        bin_obj = get_object_or_404(Bin, bin_id=bin_id)
        serializer = BinSerializer(bin_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, bin_id):
        bin_obj = get_object_or_404(Bin, bin_id=bin_id)
        serializer = BinSerializer(bin_obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, bin_id):
        bin_obj = get_object_or_404(Bin, bin_id=bin_id)
        bin_obj.is_active = False
        bin_obj.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class BinReadingCreateView(APIView):
    def post(self, request, bin_id):
        bin_obj = get_object_or_404(Bin, bin_id=bin_id, is_active=True)

        if not bin_obj.device_api_key:
            return Response({'detail': 'Bin is not configured with an API key.'}, status=status.HTTP_401_UNAUTHORIZED)

        provided_key = request.headers.get('X-Device-Key') or request.data.get('device_api_key') or ''
        if not constant_time_compare(provided_key, bin_obj.device_api_key):
            return Response({'detail': 'Invalid device API key.'}, status=status.HTTP_401_UNAUTHORIZED)

        distance_cm = request.data.get('distance_cm')
        fill_percentage = request.data.get('fill_percentage')
        
        # We also accept bin_id and status from the body per your firmware
        body_bin_id = request.data.get('bin_id')
        status_val = request.data.get('status')
        
        if distance_cm is None and fill_percentage is None:
            return Response({'detail': '"distance_cm" or "fill_percentage" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if distance_cm is not None:
                distance_cm = float(distance_cm)
            if distance_cm < 0:
                raise ValueError()
            if fill_percentage is not None:
                fill_percentage = float(fill_percentage)
        except (TypeError, ValueError):
            return Response({'detail': 'Metrics must be positive numbers.'}, status=status.HTTP_400_BAD_REQUEST)

        if fill_percentage is not None:
            fill_pct = fill_percentage
            if distance_cm is None:
                distance_cm = _distance_from_fill(bin_obj, fill_pct)
        else:
            fill_pct = _compute_fill_pct(bin_obj, distance_cm)

        reading = BinReading.objects.create(bin=bin_obj, fill_pct=fill_pct, distance_cm=distance_cm)
        
        # This will trigger an alert if fill_pct >= bin_obj.alert_threshold_pct (which is 80)
        alert = _sync_alert_for_reading(bin_obj, reading)
        _broadcast_update(bin_obj, reading)

        return Response(
            {
                'bin_id': bin_obj.bin_id,
                'fill_pct': round(fill_pct, 2),
                'distance_cm': distance_cm,
                'status': status_val or _status_for(bin_obj, fill_pct),
                'alert_id': alert.id if alert else None,
                'recorded_at': reading.recorded_at,
            },
            status=status.HTTP_201_CREATED,
        )


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base_qs = Bin.objects.filter(is_active=True).prefetch_related('readings', 'alerts')
        bins = list(get_scoped_bins(request.user, base_qs))
        latest_pcts = [(b.readings.first().fill_pct if b.readings.first() else 0.0) for b in bins]
        active_routes = CollectionRoute.objects.filter(
            status__in=[CollectionRoute.STATUS_PLANNED, CollectionRoute.STATUS_DISPATCHED]
        ).count()

        return Response({
            'total_bins': len(bins),
            'need_collection': sum(1 for b, p in zip(bins, latest_pcts) if p >= b.alert_threshold_pct),
            'avg_fill_pct': round(sum(latest_pcts) / len(bins), 1) if bins else 0.0,
            'routes_today': active_routes,
            'open_alerts': Alert.objects.filter(status=Alert.STATUS_OPEN).count(),
            'bins': BinSerializer(bins, many=True).data,
        })


class AlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Alert.objects.select_related('bin', 'reading')
        qs = get_scoped_alerts(request.user, qs)
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(AlertSerializer(qs[:100], many=True).data)


class AlertActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, alert_id, action):
        alert = get_object_or_404(Alert, id=alert_id)
        if action == 'ack':
            alert.status = Alert.STATUS_ACKNOWLEDGED
            alert.acknowledged_at = timezone.now()
        elif action == 'resolve':
            alert.status = Alert.STATUS_RESOLVED
            alert.resolved_at = timezone.now()
        else:
            return Response({'detail': 'Unsupported alert action.'}, status=status.HTTP_400_BAD_REQUEST)

        alert.save()
        return Response(AlertSerializer(alert).data)


class BinHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bin_id):
        bin_obj = get_object_or_404(Bin, bin_id=bin_id)
        readings = bin_obj.readings.order_by('recorded_at')[:50]
        return Response({
            'bin_id': bin_id,
            'readings': [
                {'fill_pct': r.fill_pct, 'recorded_at': r.recorded_at.isoformat()}
                for r in readings
            ],
        })


class TrendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        readings = (
            BinReading.objects
            .extra(select={'hour': "strftime('%%H:00', recorded_at)"})
            .values('hour')
            .annotate(avg_fill=Avg('fill_pct'))
            .order_by('hour')
        )
        return Response([
            {'hour': r['hour'], 'avg': round(r['avg_fill'], 1)}
            for r in readings
        ])


# Old routing_utils removed, now using routing package

class RoutePlanView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrCollector]

    def get(self, request):
        routes = CollectionRoute.objects.prefetch_related('bins')
        routes = get_scoped_routes(request.user, routes)
        routes = routes[:20]
        return Response(RouteSerializer(routes, many=True).data)

    def post(self, request):
        base_bins = Bin.objects.filter(is_active=True)
        base_bins = get_scoped_bins(request.user, base_bins)

        bin_ids = request.data.get('bin_ids')
        if not bin_ids:
            candidates = [
                b for b in base_bins.prefetch_related('readings')
                if b.readings.first() and b.readings.first().fill_pct >= b.route_threshold_pct
            ]
        else:
            candidates = list(base_bins.filter(bin_id__in=bin_ids))

        if not candidates:
            return Response({'detail': 'No bins currently qualify for collection.'}, status=status.HTTP_400_BAD_REQUEST)

        # Optimization is now handled by CollectionSchedule dispatch.
        # This is a legacy ad-hoc route creation.
        ordered_bin_ids = [b.bin_id for b in candidates]

        route = CollectionRoute.objects.create(
            name=request.data.get('name') or f'Route {timezone.localtime():%Y-%m-%d %H:%M}',
            optimized_order=ordered_bin_ids,
        )
        route.bins.set(candidates)
        return Response(RouteSerializer(route).data, status=status.HTTP_201_CREATED)


class RouteActionView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrCollector]

    def post(self, request, route_id, action):
        route = get_object_or_404(CollectionRoute, id=route_id)
        if action == 'dispatch':
            route.status = CollectionRoute.STATUS_DISPATCHED
            route.dispatched_at = timezone.now()
        elif action == 'complete':
            route.status = CollectionRoute.STATUS_COMPLETED
            route.completed_at = timezone.now()
        elif action == 'cancel':
            route.status = CollectionRoute.STATUS_CANCELLED
        else:
            return Response({'detail': 'Unsupported route action.'}, status=status.HTTP_400_BAD_REQUEST)

        route.save()
        return Response(RouteSerializer(route).data)


class SettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        for key, value in DEFAULT_SETTINGS.items():
            AppSetting.objects.get_or_create(key=key, defaults={'value': value})
        return Response(AppSettingSerializer(AppSetting.objects.all(), many=True).data)

    def put(self, request):
        for key, value in request.data.items():
            AppSetting.objects.update_or_create(key=key, defaults={'value': str(value)})
        return Response(AppSettingSerializer(AppSetting.objects.all(), many=True).data)


class SimulatorView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request):
        if not os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't'):
            return Response({'detail': 'Simulator is disabled in production.'}, status=status.HTTP_403_FORBIDDEN)

        bin_id = request.data.get('bin_id')
        fill_pct = request.data.get('fill_pct')
        bins = Bin.objects.filter(is_active=True)
        if bin_id:
            bins = bins.filter(bin_id=bin_id)

        created = []
        for bin_obj in bins:
            pct = float(fill_pct) if fill_pct is not None else random.randint(10, 95)
            distance = _distance_from_fill(bin_obj, pct)
            reading = BinReading.objects.create(bin=bin_obj, fill_pct=pct, distance_cm=distance)
            _sync_alert_for_reading(bin_obj, reading)
            _broadcast_update(bin_obj, reading)
            created.append({'bin_id': bin_obj.bin_id, 'fill_pct': pct, 'distance_cm': distance})

        return Response({'created': created}, status=status.HTTP_201_CREATED)

class MunicipalityViewSet(viewsets.ModelViewSet):
    queryset = Municipality.objects.all()
    serializer_class = MunicipalitySerializer
    permission_classes = [ReadOnlyOrManager]

class ZoneViewSet(viewsets.ModelViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [ReadOnlyOrManager]

class WardViewSet(viewsets.ModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    permission_classes = [ReadOnlyOrManager]

class DepotViewSet(viewsets.ModelViewSet):
    queryset = Depot.objects.all()
    serializer_class = DepotSerializer
    permission_classes = [ReadOnlyOrManager]

class ProcessingFacilityViewSet(viewsets.ModelViewSet):
    queryset = ProcessingFacility.objects.all()
    serializer_class = ProcessingFacilitySerializer
    permission_classes = [ReadOnlyOrManager]

class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Vehicle.objects.filter(is_active=True).select_related('municipality', 'zone', 'depot', 'driver', 'driver__user')
        return get_scoped_vehicles(self.request.user, qs)

    def perform_create(self, serializer):
        instance = serializer.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='VEHICLE_CREATED',
            module='Vehicles',
            record_id=instance.vehicle_id,
            municipality=instance.municipality,
            zone=instance.zone
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='VEHICLE_UPDATED',
            module='Vehicles',
            record_id=instance.vehicle_id,
            municipality=instance.municipality,
            zone=instance.zone
        )
        if instance.status == Vehicle.STATUS_MAINTENANCE:
            notification_service.notify_vehicle_maintenance(instance)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='VEHICLE_DEACTIVATED',
            module='Vehicles',
            record_id=instance.vehicle_id,
            municipality=instance.municipality,
            zone=instance.zone
        )

class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserProfile.objects.filter(employment_status__in=['ACTIVE', 'ON_LEAVE', 'SUSPENDED']).select_related('user', 'municipality', 'zone', 'ward')
        return get_scoped_staff(self.request.user, qs)

    def perform_create(self, serializer):
        instance = serializer.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='STAFF_CREATED',
            module='Staff',
            record_id=instance.employee_id or str(instance.id),
            municipality=instance.municipality,
            zone=instance.zone
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='STAFF_UPDATED',
            module='Staff',
            record_id=instance.employee_id or str(instance.id),
            municipality=instance.municipality,
            zone=instance.zone
        )

    def perform_destroy(self, instance):
        instance.employment_status = UserProfile.STATUS_INACTIVE
        instance.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='STAFF_DEACTIVATED',
            module='Staff',
            record_id=instance.employee_id or str(instance.id),
            municipality=instance.municipality,
            zone=instance.zone
        )

class CollectionScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CollectionSchedule.objects.all().select_related(
            'municipality', 'zone', 'ward', 'vehicle', 'depot', 'processing_facility', 'driver__user'
        ).prefetch_related('workers', 'bins')
        return get_scoped_schedules(self.request.user, qs)

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='SCHEDULE_CREATED',
            module='Collection Scheduling',
            record_id=instance.schedule_id,
            municipality=instance.municipality,
            zone=instance.zone
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='SCHEDULE_UPDATED',
            module='Collection Scheduling',
            record_id=instance.schedule_id,
            municipality=instance.municipality,
            zone=instance.zone
        )

    @action(detail=True, methods=['post'])
    def plan(self, request, pk=None):
        schedule = self.get_object()
        if schedule.status != CollectionSchedule.STATUS_DRAFT:
            return Response({'error': 'Only DRAFT schedules can be planned.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validation checks
        if not schedule.bins.exists():
            return Response({'error': 'Schedule must have selected bins.'}, status=status.HTTP_400_BAD_REQUEST)
        if not schedule.depot:
            return Response({'error': 'Schedule must have an assigned depot.'}, status=status.HTTP_400_BAD_REQUEST)

        schedule.status = CollectionSchedule.STATUS_PLANNED
        schedule.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='SCHEDULE_PLANNED',
            module='Collection Scheduling',
            record_id=schedule.schedule_id,
            municipality=schedule.municipality,
            zone=schedule.zone
        )
        return Response({'status': 'Schedule planned successfully.'})

    @action(detail=True, methods=['post'], url_path='dispatch')
    def dispatch_action(self, request, pk=None):
        schedule = self.get_object()
        if schedule.status != CollectionSchedule.STATUS_PLANNED:
            return Response({'error': 'Only PLANNED schedules can be dispatched.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check resources
        if schedule.vehicle and schedule.vehicle.status != Vehicle.STATUS_AVAILABLE:
            return Response({'error': 'Assigned vehicle is not available.'}, status=status.HTTP_400_BAD_REQUEST)
        if schedule.driver and schedule.driver.employment_status != 'ACTIVE':
            return Response({'error': 'Assigned driver is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate Route using new Routing Engine
        from .routing.engine import optimize_schedule_route
        from .routing.exceptions import RoutingError
        from .models import CollectionRoute
        
        # Idempotency check: cancel/delete old active routes if dispatching again
        # The prompt says: "If a schedule already has a valid generated route: Decide whether to: Reuse it or Explicitly regenerate it. Do not silently create duplicate CollectionRoute records every time dispatch is called."
        # We will delete the existing planned/dispatched route.
        existing_routes = schedule.routes.filter(status__in=[CollectionRoute.STATUS_PLANNED, CollectionRoute.STATUS_DISPATCHED])
        
        from django.db import transaction
        try:
            with transaction.atomic():
                existing_routes.delete()
                routing_result = optimize_schedule_route(schedule)
                
                # We assume one route is generated per schedule for now (single vehicle)
                if not routing_result.routes:
                    raise RoutingError('Optimizer did not generate any routes.')
                    
                first_route = routing_result.routes[0]
                
                # Extract bin ids from sequence
                ordered_bin_ids = []
                ordered_bin_pk = []
                for seq_item in first_route.sequence:
                    if seq_item.location_id.startswith("BIN_"):
                        bin_pk = seq_item.location_id.split("_")[1]
                        ordered_bin_pk.append(int(bin_pk))
                        
                # Re-fetch bins to maintain order in the optimized_order JSON
                bins_dict = {b.id: b.bin_id for b in schedule.bins.all()}
                for pk in ordered_bin_pk:
                    if pk in bins_dict:
                        ordered_bin_ids.append(bins_dict[pk])
                
                route_name = f"Route for {schedule.schedule_id}"
                route = CollectionRoute.objects.create(
                    name=route_name,
                    schedule=schedule,
                    status=CollectionRoute.STATUS_DISPATCHED,
                    optimized_order=ordered_bin_ids,
                    total_distance_km=first_route.distance_km,
                    estimated_duration_min=first_route.duration_min,
                    travel_time_available=routing_result.travel_time_available,
                    optimization_metadata={
                        'method': routing_result.optimization_method,
                        'vehicle_id': first_route.vehicle_id,
                        'sequence': [vars(s) for s in first_route.sequence]
                    },
                    start_location=schedule.depot.name if schedule.depot else "Unknown",
                    end_location=schedule.depot.name if schedule.depot else "Unknown"
                )
                route.bins.set(schedule.bins.all())
                
                if schedule.vehicle:
                    schedule.vehicle.status = Vehicle.STATUS_ASSIGNED
                    schedule.vehicle.save()

                schedule.status = CollectionSchedule.STATUS_DISPATCHED
                schedule.save()
        except RoutingError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='SCHEDULE_DISPATCHED',
            module='Collection Scheduling',
            record_id=schedule.schedule_id,
            municipality=schedule.municipality,
            zone=schedule.zone
        )
        notification_service.notify_schedule_dispatched(schedule)
        return Response({'status': 'Schedule dispatched and route created.'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        schedule = self.get_object()
        if schedule.status not in [CollectionSchedule.STATUS_DRAFT, CollectionSchedule.STATUS_PLANNED]:
            return Response({'error': 'Only DRAFT or PLANNED schedules can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        
        schedule.status = CollectionSchedule.STATUS_CANCELLED
        schedule.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='SCHEDULE_CANCELLED',
            module='Collection Scheduling',
            record_id=schedule.schedule_id,
            municipality=schedule.municipality,
            zone=schedule.zone
        )
        notification_service.notify_schedule_cancelled(schedule)
        return Response({'status': 'Schedule cancelled.'})

class DriverOperationViewSet(viewsets.ViewSet):
    """
    Endpoints for Driver & Field Worker field operations.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='schedules')
    def my_schedules(self, request):
        schedules = get_scoped_schedules(request.user, CollectionSchedule.objects.all())
        # Filter for active schedules
        schedules = schedules.filter(status__in=[CollectionSchedule.STATUS_DISPATCHED, CollectionSchedule.STATUS_IN_PROGRESS])
        serializer = CollectionScheduleSerializer(schedules, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start')
    def start_route(self, request, pk=None):
        schedule = get_object_or_404(CollectionSchedule, pk=pk)
        
        # Manually check object permission
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, schedule):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if schedule.status != CollectionSchedule.STATUS_DISPATCHED:
            return Response({'error': 'Can only start DISPATCHED schedules.'}, status=status.HTTP_400_BAD_REQUEST)
            
        route = schedule.routes.filter(status=CollectionRoute.STATUS_DISPATCHED).first()
        if not route:
            return Response({'error': 'No dispatched route found for schedule.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Transition state
        schedule.status = CollectionSchedule.STATUS_IN_PROGRESS
        schedule.save()
        
        route.status = CollectionRoute.STATUS_IN_PROGRESS
        route.save()
        
        # Idempotently generate CollectionRecords for the route if they don't exist
        for b in route.bins.all():
            CollectionRecord.objects.get_or_create(
                schedule=schedule,
                route=route,
                bin=b,
                defaults={'status': CollectionRecord.STATUS_PENDING}
            )
            
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='ROUTE_STARTED',
            module='Operations',
            record_id=route.id,
            municipality=schedule.municipality,
            zone=schedule.zone
        )
        notification_service.notify_route_started(route)
        return Response({'status': 'Route started successfully.'})

    @action(detail=True, methods=['get'], url_path='route')
    def my_route(self, request, pk=None):
        # We query by schedule PK to get the active route
        schedule = get_object_or_404(CollectionSchedule, pk=pk)
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, schedule):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        route = schedule.routes.filter(status__in=[CollectionRoute.STATUS_DISPATCHED, CollectionRoute.STATUS_IN_PROGRESS]).first()
        if not route:
            return Response({'error': 'No active route found.'}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = DriverRouteDetailSerializer(route)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='complete-route')
    def complete_route(self, request, pk=None):
        schedule = get_object_or_404(CollectionSchedule, pk=pk)
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, schedule):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if schedule.status != CollectionSchedule.STATUS_IN_PROGRESS:
            return Response({'error': 'Only IN_PROGRESS schedules can be completed.'}, status=status.HTTP_400_BAD_REQUEST)
            
        route = schedule.routes.filter(status=CollectionRoute.STATUS_IN_PROGRESS).first()
        if not route:
            return Response({'error': 'No active route found to complete.'}, status=status.HTTP_404_NOT_FOUND)
            
        # Check if all records are either COLLECTED or UNABLE_TO_COLLECT
        pending_count = route.records.filter(status__in=[CollectionRecord.STATUS_PENDING, CollectionRecord.STATUS_ARRIVED]).count()
        if pending_count > 0:
            return Response({'error': f'Cannot complete route. {pending_count} stops remain unresolved.'}, status=status.HTTP_400_BAD_REQUEST)
            
        route.status = CollectionRoute.STATUS_COMPLETED
        route.completed_at = timezone.now()
        route.save()
        
        schedule.status = CollectionSchedule.STATUS_COMPLETED
        schedule.save()
        
        if schedule.vehicle:
            schedule.vehicle.status = Vehicle.STATUS_AVAILABLE
            schedule.vehicle.save()
            
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='ROUTE_COMPLETED',
            module='Operations',
            record_id=route.id,
            municipality=schedule.municipality,
            zone=schedule.zone
        )
        notification_service.notify_route_completed(route)
        return Response({'status': 'Route completed.'})


class CollectionRecordViewSet(viewsets.ViewSet):
    """
    Endpoints for individual Collection Record actions.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'], url_path='arrive')
    def arrive(self, request, pk=None):
        record = get_object_or_404(CollectionRecord, pk=pk)
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, record):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if record.status != CollectionRecord.STATUS_PENDING:
            # Idempotency
            return Response(CollectionRecordSerializer(record).data)
            
        record.status = CollectionRecord.STATUS_ARRIVED
        record.arrived_at = timezone.now()
        record.save()
        # Do not log ARRIVED if we only want COLLECTED and EXCEPTION, but if we do want to track:
        # Actually, prompt says: "Arrive, Collect, Unable to collect" are important.
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='COLLECTION_RECORDED',
            module='Operations',
            record_id=record.id,
            municipality=record.schedule.municipality,
            zone=record.schedule.zone,
            changes={"status": "ARRIVED"}
        )
        return Response(CollectionRecordSerializer(record).data)
        
    @action(detail=True, methods=['post'], url_path='collect')
    def collect(self, request, pk=None):
        record = get_object_or_404(CollectionRecord, pk=pk)
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, record):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if record.status in [CollectionRecord.STATUS_COLLECTED, CollectionRecord.STATUS_UNABLE_TO_COLLECT]:
            return Response(CollectionRecordSerializer(record).data)
            
        record.status = CollectionRecord.STATUS_COLLECTED
        record.collected_at = timezone.now()
        if hasattr(request.user, 'profile'):
            record.collected_by = request.user.profile
        record.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='COLLECTION_RECORDED',
            module='Operations',
            record_id=record.id,
            municipality=record.schedule.municipality,
            zone=record.schedule.zone,
            changes={"status": "COLLECTED"}
        )
        return Response(CollectionRecordSerializer(record).data)

    @action(detail=True, methods=['post'], url_path='exception')
    def exception(self, request, pk=None):
        record = get_object_or_404(CollectionRecord, pk=pk)
        if not IsDriverOrWorkerAssigned().has_object_permission(request, self, record):
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        if record.status in [CollectionRecord.STATUS_COLLECTED, CollectionRecord.STATUS_UNABLE_TO_COLLECT]:
            return Response(CollectionRecordSerializer(record).data)
            
        reason = request.data.get('reason', 'OTHER')
        notes = request.data.get('notes', '')
        
        record.status = CollectionRecord.STATUS_UNABLE_TO_COLLECT
        record.exception_reason = reason
        record.notes = notes
        record.save()
        audit_service.log_action(
            user=self.request.user.profile if hasattr(self.request.user, 'profile') else None,
            action='COLLECTION_EXCEPTION',
            module='Operations',
            record_id=record.id,
            municipality=record.schedule.municipality,
            zone=record.schedule.zone,
            changes={"status": "UNABLE_TO_COLLECT", "reason": reason}
        )
        notification_service.notify_collection_exception(record)
        return Response(CollectionRecordSerializer(record).data)

from rest_framework.pagination import PageNumberPagination

class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for viewing audit logs.
    Restricted to Admins, Supervisors and Auditors.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AuditLogPagination
    
    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.all().select_related('user', 'municipality', 'zone')
        
        queryset = get_scoped_audit_logs(user, queryset)
        
        # Filtering
        module = self.request.query_params.get('module')
        action = self.request.query_params.get('action')
        role = self.request.query_params.get('role')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        search = self.request.query_params.get('search')
        
        if module:
            queryset = queryset.filter(module=module)
        if action:
            queryset = queryset.filter(action=action)
        if role:
            queryset = queryset.filter(user__role=role)
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(actor_name__icontains=search) |
                Q(record_id__icontains=search) |
                Q(user__user__username__icontains=search) |
                Q(user__employee_id__icontains=search)
            )
            
        return queryset


class DemoStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        is_enabled = os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't')
        has_dataset = Municipality.objects.filter(is_demo=True).exists()
        
        real_bins = Bin.objects.filter(data_source=Bin.DATA_SOURCE_REAL).count()
        sim_bins = Bin.objects.filter(data_source=Bin.DATA_SOURCE_SIMULATED).count()
        
        return Response({
            "is_enabled": is_enabled,
            "has_dataset": has_dataset,
            "counts": {
                "real_bins": real_bins,
                "simulated_bins": sim_bins
            }
        })

class DemoGenerateView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def post(self, request):
        if not os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't'):
            return Response(
                {"error": "Demo simulation is disabled in this environment."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        profile = request.user.profile if hasattr(request.user, 'profile') else None
        
        try:
            result = DemoDataService.generate_demo_dataset(profile)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": "Demo dataset generation failed.", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DemoResetView(APIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def delete(self, request):
        if not os.getenv('ENABLE_SIMULATOR', 'False').lower() in ('true', '1', 't'):
            return Response(
                {"error": "Demo simulation is disabled in this environment."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        profile = request.user.profile if hasattr(request.user, 'profile') else None
        
        try:
            result = DemoDataService.reset_demo_dataset(profile)
            return Response(result)
        except Exception as e:
            return Response(
                {"error": "Demo dataset reset failed.", "details": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
