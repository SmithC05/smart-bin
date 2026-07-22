from django.urls import path

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
)


urlpatterns = [
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
]
