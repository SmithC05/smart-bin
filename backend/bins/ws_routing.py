from django.urls import path

from . import consumers


websocket_urlpatterns = [
    path('ws/bins/', consumers.BinUpdateConsumer.as_asgi()),
]
