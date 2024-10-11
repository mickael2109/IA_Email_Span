from channels.generic.websocket import WebsocketConsumer
import json

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        
        # Ici, vous pouvez traiter le message (par exemple, classification) et renvoyer la réponse
        self.send(text_data=json.dumps({
            'message': message
        }))
