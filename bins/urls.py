# bins/urls.py
from django.urls import path
from .views import (
    BinListView,
    BinDetailView,
    BinReadingCreateView,
    DashboardView,
    AlertsView,
)

urlpatterns = [
    path('api/bins/',                          BinListView.as_view(),          name='bin-list'),
    path('api/bins/<str:bin_id>/',             BinDetailView.as_view(),        name='bin-detail'),
    path('api/bins/<str:bin_id>/reading/',     BinReadingCreateView.as_view(), name='bin-reading-create'),
    path('api/dashboard/',                     DashboardView.as_view(),        name='dashboard'),
    path('api/alerts/',                        AlertsView.as_view(),           name='alerts'),
]
