# bins/views.py
from django.db.models import Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Bin, BinReading
from .serializers import BinSerializer, BinDetailSerializer, BinReadingSerializer

# ── Constants ─────────────────────────────────────────────────────────────────
BIN_DEPTH_CM = 40.0   # total bin depth used for distance → fill % conversion


def _compute_fill_pct(distance_cm: float) -> float:
    """Convert HC-SR04 distance reading to fill percentage."""
    return max(0.0, min(100.0, (1 - distance_cm / BIN_DEPTH_CM) * 100))


# ── 1. GET /api/bins/ ─────────────────────────────────────────────────────────
class BinListView(APIView):
    """Return list of all active bins with latest_pct and status."""

    def get(self, request):
        bins = Bin.objects.filter(is_active=True).prefetch_related('readings')
        serializer = BinSerializer(bins, many=True)
        return Response(serializer.data)


# ── 2. GET /api/bins/<bin_id>/ ────────────────────────────────────────────────
class BinDetailView(APIView):
    """Return a single bin with its last 20 readings."""

    def get(self, request, bin_id):
        try:
            bin_obj = Bin.objects.prefetch_related('readings').get(bin_id=bin_id)
        except Bin.DoesNotExist:
            return Response({'detail': f'Bin {bin_id!r} not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = BinDetailSerializer(bin_obj)
        return Response(serializer.data)


# ── 3. POST /api/bins/<bin_id>/reading/ ───────────────────────────────────────
class BinReadingCreateView(APIView):
    """Called by ESP32 nodes to submit a new distance reading."""

    def post(self, request, bin_id):
        try:
            bin_obj = Bin.objects.get(bin_id=bin_id)
        except Bin.DoesNotExist:
            return Response({'detail': f'Bin {bin_id!r} not found.'}, status=status.HTTP_404_NOT_FOUND)

        distance_cm = request.data.get('distance_cm')
        if distance_cm is None:
            return Response({'detail': '"distance_cm" is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            distance_cm = float(distance_cm)
        except (TypeError, ValueError):
            return Response({'detail': '"distance_cm" must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

        fill_pct = _compute_fill_pct(distance_cm)

        reading = BinReading.objects.create(
            bin=bin_obj,
            fill_pct=fill_pct,
            distance_cm=distance_cm,
        )

        return Response(
            {
                'bin_id':      bin_obj.bin_id,
                'fill_pct':    round(fill_pct, 2),
                'distance_cm': distance_cm,
                'recorded_at': reading.recorded_at,
            },
            status=status.HTTP_201_CREATED,
        )


# ── 4. GET /api/dashboard/ ────────────────────────────────────────────────────
class DashboardView(APIView):
    """Aggregated summary for the dashboard page."""

    def get(self, request):
        bins = list(Bin.objects.filter(is_active=True).prefetch_related('readings'))

        latest_pcts = []
        for b in bins:
            reading = b.readings.first()
            latest_pcts.append(reading.fill_pct if reading else 0.0)

        total_bins      = len(bins)
        need_collection = sum(1 for p in latest_pcts if p >= 80)
        avg_fill_pct    = round(sum(latest_pcts) / total_bins, 1) if total_bins else 0.0

        bins_data = BinSerializer(bins, many=True).data

        return Response({
            'total_bins':      total_bins,
            'need_collection': need_collection,
            'avg_fill_pct':    avg_fill_pct,
            'routes_today':    2,       # hardcoded placeholder — will be dynamic later
            'bins':            bins_data,
        })


# ── 5. GET /api/alerts/ ───────────────────────────────────────────────────────
class AlertsView(APIView):
    """Return alerts derived from the last 20 BinReadings across all bins."""

    def get(self, request):
        readings = (
            BinReading.objects
            .select_related('bin')
            .order_by('-recorded_at')[:20]
        )

        alerts = []
        for reading in readings:
            if reading.fill_pct >= 80:
                alerts.append({
                    'bin_id':      reading.bin.bin_id,
                    'location':    reading.bin.location,
                    'fill_pct':    round(reading.fill_pct, 1),
                    'recorded_at': reading.recorded_at,
                    'level':       'danger',
                })

        return Response(alerts)
