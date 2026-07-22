import random

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Alert, AppSetting, Bin, BinReading, CollectionRoute
from .serializers import (
    AlertSerializer,
    AppSettingSerializer,
    BinDetailSerializer,
    BinSerializer,
    RouteSerializer,
)


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
            alert.resolved_at = None
            alert.save()
            return alert

        return Alert.objects.create(
            bin=bin_obj,
            reading=reading,
            fill_pct=reading.fill_pct,
            level=Alert.LEVEL_DANGER,
            message=f'{bin_obj.bin_id} reached {reading.fill_pct:.1f}% fill level.',
        )

    for alert in active_alerts:
        alert.status = Alert.STATUS_RESOLVED
        alert.resolved_at = timezone.now()
        alert.save()

    return None


class BinListView(APIView):
    def get(self, request):
        bins = Bin.objects.filter(is_active=True).prefetch_related('readings', 'alerts')
        serializer = BinSerializer(bins, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = BinSerializer(data=request.data)
        if serializer.is_valid():
            bin_obj = serializer.save()
            return Response(BinSerializer(bin_obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BinDetailView(APIView):
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

        if bin_obj.device_api_key:
            provided_key = request.headers.get('X-Device-Key') or request.data.get('device_api_key')
            if provided_key != bin_obj.device_api_key:
                return Response({'detail': 'Invalid device API key.'}, status=status.HTTP_401_UNAUTHORIZED)

        distance_cm = request.data.get('distance_cm')
        if distance_cm is None:
            return Response({'detail': '"distance_cm" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            distance_cm = float(distance_cm)
        except (TypeError, ValueError):
            return Response({'detail': '"distance_cm" must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

        fill_pct = _compute_fill_pct(bin_obj, distance_cm)
        reading = BinReading.objects.create(bin=bin_obj, fill_pct=fill_pct, distance_cm=distance_cm)
        alert = _sync_alert_for_reading(bin_obj, reading)
        _broadcast_update(bin_obj, reading)

        return Response(
            {
                'bin_id': bin_obj.bin_id,
                'fill_pct': round(fill_pct, 2),
                'distance_cm': distance_cm,
                'alert_id': alert.id if alert else None,
                'recorded_at': reading.recorded_at,
            },
            status=status.HTTP_201_CREATED,
        )


class DashboardView(APIView):
    def get(self, request):
        bins = list(Bin.objects.filter(is_active=True).prefetch_related('readings', 'alerts'))
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
    def get(self, request):
        qs = Alert.objects.select_related('bin', 'reading')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(AlertSerializer(qs[:100], many=True).data)


class AlertActionView(APIView):
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


class RoutePlanView(APIView):
    def get(self, request):
        routes = CollectionRoute.objects.prefetch_related('bins')[:20]
        return Response(RouteSerializer(routes, many=True).data)

    def post(self, request):
        bin_ids = request.data.get('bin_ids')
        if not bin_ids:
            candidates = [
                b for b in Bin.objects.filter(is_active=True).prefetch_related('readings')
                if b.readings.first() and b.readings.first().fill_pct >= b.route_threshold_pct
            ]
            candidates.sort(key=lambda b: b.readings.first().fill_pct, reverse=True)
        else:
            candidates = list(Bin.objects.filter(bin_id__in=bin_ids, is_active=True))

        if not candidates:
            return Response({'detail': 'No bins currently qualify for collection.'}, status=status.HTTP_400_BAD_REQUEST)

        route = CollectionRoute.objects.create(
            name=request.data.get('name') or f'Route {timezone.localtime():%Y-%m-%d %H:%M}',
            optimized_order=[b.bin_id for b in candidates],
        )
        route.bins.set(candidates)
        return Response(RouteSerializer(route).data, status=status.HTTP_201_CREATED)


class RouteActionView(APIView):
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
    def get(self, request):
        for key, value in DEFAULT_SETTINGS.items():
            AppSetting.objects.get_or_create(key=key, defaults={'value': value})
        return Response(AppSettingSerializer(AppSetting.objects.all(), many=True).data)

    def put(self, request):
        for key, value in request.data.items():
            AppSetting.objects.update_or_create(key=key, defaults={'value': str(value)})
        return Response(AppSettingSerializer(AppSetting.objects.all(), many=True).data)


class SimulatorView(APIView):
    def post(self, request):
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
