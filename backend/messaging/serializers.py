from rest_framework import serializers
from .models import Message, Conversation
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture']
    
    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile.profile_picture:
            return obj.profile.profile_picture.url
        return None

class MessageSerializer(serializers.ModelSerializer):
    is_sent_by_me = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'content', 'message_type', 'media_url', 'media_type', 'timestamp', 'is_read', 'is_sent_by_me']
    
    def get_is_sent_by_me(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.sender_id == request.user.id
        return False

    def get_media_url(self, obj):
        if obj.media_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.media_file.url)
        return None

class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message']
    
    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            other_user = obj.get_other_participant(request.user)
            return UserSerializer(other_user).data
        return None
    
    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return {
                'content': last_message.content,
                'message_type': last_message.message_type,
                'media_url': self.context['request'].build_absolute_uri(last_message.media_file.url) if last_message.media_file else None,
                'timestamp': last_message.timestamp,
                'is_read': last_message.is_read
            }
        return None 