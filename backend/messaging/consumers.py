import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Message, Conversation
from django.utils import timezone
from django.db.models import Q
from users.models import Connection

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_name = f"user_{self.user_id}"
        self.room_group_name = f"chat_{self.room_name}"
        self.user = None

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            
            if text_data_json.get('type') == 'authenticate':
                await self.handle_authentication(text_data_json)
            elif not self.user:
                await self.send(text_data=json.dumps({
                    'error': 'Not authenticated'
                }))
                return
            else:
                await self.handle_message(text_data_json)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid message format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def handle_authentication(self, data):
        token = data.get('token')
        try:
            token_obj = AccessToken(token)
            user_id = token_obj['user_id']
            self.user = await self.get_user(user_id)
            
            if str(self.user.id) != str(self.user_id):
                await self.send(text_data=json.dumps({
                    'error': 'Invalid user authentication'
                }))
                await self.close()
                return
            
            await self.send(text_data=json.dumps({
                'type': 'authentication_successful'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': 'Invalid authentication token'
            }))
            await self.close()

    async def handle_message(self, data):
        message = data.get('message')
        recipient_id = data.get('recipient_id')
        message_type = data.get('message_type', 'text')
        media_url = data.get('media_url')
        media_type = data.get('media_type')
        
        if not message or not recipient_id:
            await self.send(text_data=json.dumps({
                'error': 'Message and recipient_id are required'
            }))
            return
        
        try:
            # Check if users are connected
            is_connected = await self.check_connection(self.user.id, recipient_id)
            if not is_connected:
                await self.send(text_data=json.dumps({
                    'error': 'You must be connected to the user to send messages'
                }))
                return
                
            # Save message and update conversation
            saved_message = await self.save_message(
                self.user.id,
                recipient_id,
                message,
                message_type,
                media_url,
                media_type
            )
            
            # Send message to recipient's room - fix the room name format
            recipient_room = f"chat_user_{recipient_id}"
            await self.channel_layer.group_send(
                recipient_room,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': self.user.id,
                    'message_type': message_type,
                    'media_url': media_url,
                    'media_type': media_type,
                    'timestamp': saved_message.timestamp.isoformat()
                }
            )
            
            # Send confirmation back to sender
            await self.send(text_data=json.dumps({
                'type': 'message_sent',
                'message': message,
                'message_type': message_type,
                'media_url': media_url,
                'media_type': media_type,
                'timestamp': saved_message.timestamp.isoformat()
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': f'Failed to send message: {str(e)}'
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'message_type': event.get('message_type', 'text'),
            'media_url': event.get('media_url'),
            'media_type': event.get('media_type'),
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
            
    @database_sync_to_async
    def check_connection(self, sender_id, recipient_id):
        return Connection.objects.filter(
            (Q(sender_id=sender_id, receiver_id=recipient_id) | 
             Q(sender_id=recipient_id, receiver_id=sender_id)),
            status='ACCEPTED'
        ).exists()

    @database_sync_to_async
    def save_message(self, sender_id, recipient_id, content, message_type='text', media_url=None, media_type=None):
        conversation = Conversation.objects.get_or_create_conversation(sender_id, recipient_id)
        message = Message.objects.create(
            conversation=conversation,
            sender_id=sender_id,
            receiver_id=recipient_id,
            content=content,
            message_type=message_type,
            media_type=media_type or ''
        )
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        return message 