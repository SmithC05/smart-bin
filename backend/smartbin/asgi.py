import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

import bins.routing


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartbin.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(bins.routing.websocket_urlpatterns)
    ),
})
