import csv
from datetime import datetime, time
from django.utils import timezone
from django.db.models import Count, Q, Avg, Sum, F, ExpressionWrapper, DurationField
from django.http import HttpResponse
from .models import (
    Bin, BinReading, Alert, CollectionSchedule, CollectionRoute,
    CollectionRecord, Vehicle, UserProfile, AuditLog
)
from .rbac import (
    get_scoped_bins, get_scoped_alerts, get_scoped_schedules,
    get_scoped_routes, get_scoped_vehicles, get_scoped_staff,
    get_scoped_audit_logs
)

class ReportingService:
    @staticmethod
    def parse_dates(request):
        from_date_str = request.query_params.get('from')
        to_date_str = request.query_params.get('to')
        
        from_date = None
        to_date = None
        
        if from_date_str:
            try:
                dt = datetime.strptime(from_date_str, '%Y-%m-%d')
                from_date = timezone.make_aware(datetime.combine(dt, time.min))
            except ValueError:
                pass
                
        if to_date_str:
            try:
                dt = datetime.strptime(to_date_str, '%Y-%m-%d')
                to_date = timezone.make_aware(datetime.combine(dt, time.max))
            except ValueError:
                pass
                
        return from_date, to_date

    @staticmethod
    def apply_filters(queryset, request, date_field='created_at', prefix=''):
        from_date, to_date = ReportingService.parse_dates(request)
        
        if from_date:
            queryset = queryset.filter(**{f"{date_field}__gte": from_date})
        if to_date:
            queryset = queryset.filter(**{f"{date_field}__lte": to_date})
            
        muni = request.query_params.get('municipality')
        zone = request.query_params.get('zone')
        ward = request.query_params.get('ward')
        vehicle = request.query_params.get('vehicle')
        driver = request.query_params.get('driver')
        status = request.query_params.get('status')
        
        if muni:
            queryset = queryset.filter(**{f"{prefix}municipality_id": muni})
        if zone:
            queryset = queryset.filter(**{f"{prefix}zone_id": zone})
        if ward:
            queryset = queryset.filter(**{f"{prefix}ward_id": ward})
        if vehicle and hasattr(queryset.model, 'vehicle'):
            queryset = queryset.filter(vehicle_id=vehicle)
        if driver and hasattr(queryset.model, 'driver'):
            queryset = queryset.filter(driver_id=driver)
        if status and hasattr(queryset.model, 'status'):
            queryset = queryset.filter(status=status)
            
        return queryset

    @staticmethod
    def get_overview_report(user, request):
        schedules = get_scoped_schedules(user, CollectionSchedule.objects.all())
        schedules = ReportingService.apply_filters(schedules, request, date_field='date')
        
        bins = get_scoped_bins(user, Bin.objects.all())
        bins = ReportingService.apply_filters(bins, request)
        
        alerts = get_scoped_alerts(user, Alert.objects.all())
        alerts = ReportingService.apply_filters(alerts, request, prefix='bin__')

        vehicles = get_scoped_vehicles(user, Vehicle.objects.all())
        vehicles = ReportingService.apply_filters(vehicles, request)

        staff = get_scoped_staff(user, UserProfile.objects.all())
        staff = ReportingService.apply_filters(staff, request)

        schedule_counts = schedules.values('status').annotate(count=Count('id'))
        sched_stats = {s['status']: s['count'] for s in schedule_counts}
        total_schedules = sum(sched_stats.values())
        
        alert_counts = alerts.values('status').annotate(count=Count('id'))
        alert_stats = {s['status']: s['count'] for s in alert_counts}

        vehicle_counts = vehicles.values('status').annotate(count=Count('id'))
        veh_stats = {s['status']: s['count'] for s in vehicle_counts}

        staff_counts = staff.values('employment_status', 'role').annotate(count=Count('id'))
        
        active_drivers = sum(s['count'] for s in staff_counts if s['employment_status'] == 'ACTIVE' and s['role'] == UserProfile.ROLE_DRIVER)
        active_workers = sum(s['count'] for s in staff_counts if s['employment_status'] == 'ACTIVE' and s['role'] == UserProfile.ROLE_FIELD_WORKER)

        return {
            "schedules": {
                "total": total_schedules,
                "planned": sched_stats.get(CollectionSchedule.STATUS_PLANNED, 0),
                "dispatched": sched_stats.get(CollectionSchedule.STATUS_DISPATCHED, 0),
                "completed": sched_stats.get(CollectionSchedule.STATUS_COMPLETED, 0),
                "cancelled": sched_stats.get(CollectionSchedule.STATUS_CANCELLED, 0),
            },
            "bins": {
                "total": bins.count(),
                "open_alerts": alert_stats.get(Alert.STATUS_OPEN, 0)
            },
            "fleet": {
                "active": veh_stats.get(Vehicle.STATUS_AVAILABLE, 0) + veh_stats.get(Vehicle.STATUS_ASSIGNED, 0) + veh_stats.get(Vehicle.STATUS_ON_ROUTE, 0),
                "on_route": veh_stats.get(Vehicle.STATUS_ON_ROUTE, 0),
                "maintenance": veh_stats.get(Vehicle.STATUS_MAINTENANCE, 0)
            },
            "workforce": {
                "active_drivers": active_drivers,
                "active_workers": active_workers
            }
        }

    @staticmethod
    def get_collections_report(user, request):
        schedules = get_scoped_schedules(user, CollectionSchedule.objects.all())
        schedules = ReportingService.apply_filters(schedules, request, date_field='date')
        
        schedule_counts = schedules.values('status').annotate(count=Count('id'))
        sched_stats = {s['status']: s['count'] for s in schedule_counts}
        
        records = CollectionRecord.objects.filter(schedule__in=schedules)
        record_counts = records.values('status').annotate(count=Count('id'))
        record_stats = {r['status']: r['count'] for r in record_counts}
        
        total_records = sum(record_stats.values())
        completed_records = record_stats.get(CollectionRecord.STATUS_COLLECTED, 0)
        
        completion_rate = round((completed_records / total_records * 100), 2) if total_records > 0 else 0

        return {
            "schedules": {
                "total": sum(sched_stats.values()),
                "draft": sched_stats.get(CollectionSchedule.STATUS_DRAFT, 0),
                "planned": sched_stats.get(CollectionSchedule.STATUS_PLANNED, 0),
                "dispatched": sched_stats.get(CollectionSchedule.STATUS_DISPATCHED, 0),
                "in_progress": sched_stats.get(CollectionSchedule.STATUS_IN_PROGRESS, 0),
                "completed": sched_stats.get(CollectionSchedule.STATUS_COMPLETED, 0),
                "cancelled": sched_stats.get(CollectionSchedule.STATUS_CANCELLED, 0),
            },
            "records": {
                "total": total_records,
                "collected": completed_records,
                "unable_to_collect": record_stats.get(CollectionRecord.STATUS_UNABLE_TO_COLLECT, 0),
                "pending": record_stats.get(CollectionRecord.STATUS_PENDING, 0),
                "arrived": record_stats.get(CollectionRecord.STATUS_ARRIVED, 0),
                "completion_rate": completion_rate
            }
        }

    @staticmethod
    def get_exceptions_report(user, request):
        schedules = get_scoped_schedules(user, CollectionSchedule.objects.all())
        schedules = ReportingService.apply_filters(schedules, request, date_field='date')
        
        records = CollectionRecord.objects.filter(
            schedule__in=schedules, 
            status=CollectionRecord.STATUS_UNABLE_TO_COLLECT
        ).select_related('bin', 'bin__zone', 'schedule__vehicle', 'schedule__driver__user')
        
        exception_counts = records.values('exception_reason').annotate(count=Count('id'))
        
        details = []
        for r in records:
            details.append({
                "date": r.schedule.date.isoformat(),
                "schedule_id": r.schedule.schedule_id,
                "bin_id": r.bin.bin_id,
                "zone_name": r.bin.zone.name if r.bin.zone else "N/A",
                "driver_name": f"{r.schedule.driver.user.first_name} {r.schedule.driver.user.last_name}".strip() if r.schedule.driver else "N/A",
                "vehicle": r.schedule.vehicle.registration_number if r.schedule.vehicle else "N/A",
                "reason": r.exception_reason,
                "notes": r.notes
            })
            
        return {
            "summary": {e['exception_reason']: e['count'] for e in exception_counts},
            "details": details
        }

    @staticmethod
    def get_bins_report(user, request):
        bins = get_scoped_bins(user, Bin.objects.all())
        bins = ReportingService.apply_filters(bins, request)
        
        from_date, to_date = ReportingService.parse_dates(request)
        readings_qs = BinReading.objects.filter(bin__in=bins)
        if from_date:
            readings_qs = readings_qs.filter(recorded_at__gte=from_date)
        if to_date:
            readings_qs = readings_qs.filter(recorded_at__lte=to_date)
            
        # Time-series fill trend
        trend = readings_qs.extra(
            select={'day': 'date(recorded_at)'}
        ).values('day').annotate(
            avg_fill=Avg('fill_pct'),
            count=Count('id')
        ).order_by('day')
        
        trend_list = []
        for t in trend:
            trend_list.append({
                "day": t['day'],
                "avg_fill": round(t['avg_fill'], 2),
                "count": t['count']
            })
        
        return {
            "total_bins": bins.count(),
            "trend": trend_list
        }

    @staticmethod
    def get_alerts_report(user, request):
        alerts = get_scoped_alerts(user, Alert.objects.all())
        alerts = ReportingService.apply_filters(alerts, request, prefix='bin__')
        
        status_counts = alerts.values('status').annotate(count=Count('id'))
        level_counts = alerts.values('level').annotate(count=Count('id'))
        
        resolved_alerts = alerts.filter(status=Alert.STATUS_RESOLVED, resolved_at__isnull=False, created_at__isnull=False)
        avg_resolution = resolved_alerts.annotate(
            duration=ExpressionWrapper(F('resolved_at') - F('created_at'), output_field=DurationField())
        ).aggregate(avg=Avg('duration'))['avg']
        
        avg_hours = None
        if avg_resolution:
            avg_hours = round(avg_resolution.total_seconds() / 3600, 2)
            
        return {
            "total": alerts.count(),
            "status_summary": {s['status']: s['count'] for s in status_counts},
            "level_summary": {l['level']: l['count'] for l in level_counts},
            "avg_resolution_hours": avg_hours
        }

    @staticmethod
    def get_fleet_report(user, request):
        vehicles = get_scoped_vehicles(user, Vehicle.objects.all())
        vehicles = ReportingService.apply_filters(vehicles, request)
        
        status_counts = vehicles.values('status').annotate(count=Count('id'))
        type_counts = vehicles.values('vehicle_type').annotate(count=Count('id'))
        
        schedules = get_scoped_schedules(user, CollectionSchedule.objects.all())
        schedules = ReportingService.apply_filters(schedules, request, date_field='date')
        
        vehicle_ops = schedules.exclude(vehicle__isnull=True).values('vehicle__registration_number').annotate(
            assigned=Count('id'),
            completed=Count('id', filter=Q(status=CollectionSchedule.STATUS_COMPLETED))
        )
        
        return {
            "total": vehicles.count(),
            "status_summary": {s['status']: s['count'] for s in status_counts},
            "type_summary": {t['vehicle_type']: t['count'] for t in type_counts},
            "utilization": "Vehicle utilization data not available (historical operating-duration data is not currently recorded).",
            "operations": list(vehicle_ops)
        }
        
    @staticmethod
    def get_workforce_report(user, request):
        staff = get_scoped_staff(user, UserProfile.objects.all())
        staff = ReportingService.apply_filters(staff, request)
        
        role_counts = staff.values('role').annotate(count=Count('id'))
        status_counts = staff.values('employment_status').annotate(count=Count('id'))
        
        return {
            "total": staff.count(),
            "roles": {r['role']: r['count'] for r in role_counts},
            "status": {s['employment_status']: s['count'] for s in status_counts}
        }
        
    @staticmethod
    def get_zones_report(user, request):
        schedules = get_scoped_schedules(user, CollectionSchedule.objects.all())
        schedules = ReportingService.apply_filters(schedules, request, date_field='date')
        
        zone_perf = schedules.exclude(zone__isnull=True).values('zone__name').annotate(
            total_schedules=Count('id'),
            completed_schedules=Count('id', filter=Q(status=CollectionSchedule.STATUS_COMPLETED))
        )
        
        records = CollectionRecord.objects.filter(
            schedule__in=schedules, 
            status=CollectionRecord.STATUS_UNABLE_TO_COLLECT
        ).exclude(bin__zone__isnull=True).values('bin__zone__name').annotate(
            exceptions=Count('id')
        )
        exceptions_map = {r['bin__zone__name']: r['exceptions'] for r in records}
        
        alerts = get_scoped_alerts(user, Alert.objects.filter(status=Alert.STATUS_OPEN))
        alerts = alerts.exclude(bin__zone__isnull=True).values('bin__zone__name').annotate(
            open_alerts=Count('id')
        )
        alerts_map = {a['bin__zone__name']: a['open_alerts'] for a in alerts}
        
        results = []
        for zp in zone_perf:
            name = zp['zone__name']
            results.append({
                "zone": name,
                "schedules": zp['total_schedules'],
                "completed": zp['completed_schedules'],
                "exceptions": exceptions_map.get(name, 0),
                "open_alerts": alerts_map.get(name, 0)
            })
            
        return results

    @staticmethod
    def export_csv(headers, data, filename="export.csv"):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        writer.writerow(headers)
        for row in data:
            writer.writerow(row)
            
        return response
