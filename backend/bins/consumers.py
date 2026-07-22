from asgiref.sync import async_to_sync
from channels.generic.websocket import JsonWebsocketConsumer


class BinUpdateConsumer(JsonWebsocketConsumer):
    GROUP_NAME = 'bin_updates'

    def connect(self):
        async_to_sync(self.channel_layer.group_add)(
            self.GROUP_NAME,
            self.channel_name,
        )
        self.accept()
        self.send_json({'type': 'connected', 'message': 'SmartBin WS ready'})

    def disconnect(self, code):
        async_to_sync(self.channel_layer.group_discard)(
            self.GROUP_NAME,
            self.channel_name,
        )

    def receive_json(self, content):
        pass

    def bin_update(self, event):
        self.send_json(event['data'])
