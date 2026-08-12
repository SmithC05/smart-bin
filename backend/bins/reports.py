from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .reporting_service import ReportingService

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _handle_export(self, request, data, report_name):
        if request.query_params.get('export') == 'csv':
            if isinstance(data, dict):
                # Flatten dict for CSV if needed, or if it's already list of dicts handle that
                if "details" in data and isinstance(data["details"], list):
                    rows = data["details"]
                elif "trend" in data and isinstance(data["trend"], list):
                    rows = data["trend"]
                elif "operations" in data and isinstance(data["operations"], list):
                    rows = data["operations"]
                else:
                    # Generic flatten single dict
                    rows = [data]
            else:
                rows = data
                
            if not rows:
                return ReportingService.export_csv(["Message"], [["NO DATA AVAILABLE"]], f"{report_name}.csv")
                
            if isinstance(rows, list) and len(rows) > 0 and isinstance(rows[0], dict):
                headers = list(rows[0].keys())
                csv_data = [[str(row.get(h, '')) for h in headers] for row in rows]
                return ReportingService.export_csv(headers, csv_data, f"{report_name}.csv")
            
        return Response(data)

    @action(detail=False, methods=['get'])
    def overview(self, request):
        data = ReportingService.get_overview_report(request.user, request)
        return self._handle_export(request, data, 'overview')

    @action(detail=False, methods=['get'])
    def collections(self, request):
        data = ReportingService.get_collections_report(request.user, request)
        return self._handle_export(request, data, 'collections')

    @action(detail=False, methods=['get'])
    def exceptions(self, request):
        data = ReportingService.get_exceptions_report(request.user, request)
        return self._handle_export(request, data, 'exceptions')

    @action(detail=False, methods=['get'])
    def bins(self, request):
        data = ReportingService.get_bins_report(request.user, request)
        return self._handle_export(request, data, 'bins')

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        data = ReportingService.get_alerts_report(request.user, request)
        return self._handle_export(request, data, 'alerts')

    @action(detail=False, methods=['get'])
    def fleet(self, request):
        data = ReportingService.get_fleet_report(request.user, request)
        return self._handle_export(request, data, 'fleet')

    @action(detail=False, methods=['get'])
    def workforce(self, request):
        data = ReportingService.get_workforce_report(request.user, request)
        return self._handle_export(request, data, 'workforce')

    @action(detail=False, methods=['get'])
    def zones(self, request):
        data = ReportingService.get_zones_report(request.user, request)
        return self._handle_export(request, data, 'zones')
