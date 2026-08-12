from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    AlertActionView,
    AlertsView,
    BinDetailView,
    BinHistoryView,
    BinListView,
    BinReadingCreateView,
    DashboardView,
    RouteActionView,
    RoutePlanView,
    SettingsView,
    SimulatorView,
    TrendView,
    CurrentUserView,
    MunicipalityViewSet,
    ZoneViewSet,
    WardViewSet,
    DepotViewSet,
    ProcessingFacilityViewSet,
    VehicleViewSet,
    StaffViewSet,
    CollectionScheduleViewSet,
    DriverOperationViewSet,
    CollectionRecordViewSet,
    AuditLogViewSet,
    DemoStatusView,
    DemoGenerateView,
    DemoResetView
)
from .reports import ReportViewSet
from .notifications import NotificationViewSet

router = DefaultRouter()
router.register(r'api/municipalities', MunicipalityViewSet)
router.register(r'api/zones', ZoneViewSet)
router.register(r'api/wards', WardViewSet)
router.register(r'api/depots', DepotViewSet, basename='depot')
router.register(r'api/facilities', ProcessingFacilityViewSet, basename='facility')
router.register(r'api/vehicles', VehicleViewSet, basename='vehicle')
router.register(r'api/staff', StaffViewSet, basename='staff')
router.register(r'api/schedules', CollectionScheduleViewSet, basename='schedules')
router.register(r'api/driver', DriverOperationViewSet, basename='driver-ops')
router.register(r'api/audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'api/driver/records', CollectionRecordViewSet, basename='driver_records')
router.register(r'api/reports', ReportViewSet, basename='reports')
router.register(r'api/notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/user/', CurrentUserView.as_view(), name='current_user'),
    path('api/bins/', BinListView.as_view(), name='bin-list'),
    path('api/bins/<str:bin_id>/', BinDetailView.as_view(), name='bin-detail'),
    path('api/bins/<str:bin_id>/history/', BinHistoryView.as_view(), name='bin-history'),
    path('api/bins/<str:bin_id>/reading/', BinReadingCreateView.as_view(), name='bin-reading-create'),
    path('api/dashboard/', DashboardView.as_view(), name='dashboard'),
    path('api/trend/', TrendView.as_view(), name='trend'),
    path('api/alerts/', AlertsView.as_view(), name='alerts'),
    path('api/alerts/<int:alert_id>/<str:action>/', AlertActionView.as_view(), name='alert-action'),
    path('api/routes/', RoutePlanView.as_view(), name='route-list-create'),
    path('api/routes/<int:route_id>/<str:action>/', RouteActionView.as_view(), name='route-action'),
    path('api/settings/', SettingsView.as_view(), name='settings'),
    path('api/simulate/', SimulatorView.as_view(), name='simulate'),
    path('api/demo/status/', DemoStatusView.as_view(), name='demo-status'),
    path('api/demo/generate/', DemoGenerateView.as_view(), name='demo-generate'),
    path('api/demo/reset/', DemoResetView.as_view(), name='demo-reset'),
] + router.urls
