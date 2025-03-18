from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from .models import Message, Conversation
from .serializers import MessageSerializer, ConversationSerializer
from users.models import User, Connection
from django.db.models import Max
from django.utils import timezone
import os
import mimetypes

# Create your views here.

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_media(request):
    try:
        media_file = request.FILES.get('media_file')
        recipient_id = request.data.get('recipient_id')
        message_type = request.data.get('message_type')
        media_type = request.data.get('media_type')

        if not all([media_file, recipient_id, message_type]):
            return Response({
                'error': 'Missing required fields'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if users are connected
        if not Connection.objects.filter(
            (Q(sender=request.user, receiver_id=recipient_id) | Q(sender_id=recipient_id, receiver=request.user)),
            status='ACCEPTED'
        ).exists():
            return Response({'error': 'Users are not connected'}, status=status.HTTP_403_FORBIDDEN)

        # Get or create conversation
        conversation = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=recipient_id
        ).first()

        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, recipient_id)

        # Create message with media
        message = Message.objects.create(
            sender=request.user,
            receiver_id=recipient_id,
            conversation=conversation,
            message_type=message_type,
            media_file=media_file,
            media_type=media_type or mimetypes.guess_type(media_file.name)[0],
            content=request.data.get('content') or f"Sent a {message_type}"  # Use custom content if provided
        )

        return Response({
            'content': message.content,
            'media_url': request.build_absolute_uri(message.media_file.url),
            'message_type': message.message_type,
            'media_type': message.media_type
        })

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    conversations = request.user.conversations.all()
    data = []
    
    for conversation in conversations:
        other_user = conversation.get_other_participant(request.user)
        last_message = conversation.messages.last()
        
        data.append({
            'id': conversation.id,
            'other_user': {
                'id': other_user.id,
                'username': other_user.username,
                'email': other_user.email,
                'profile_picture': other_user.profile.profile_picture.url if hasattr(other_user, 'profile') and other_user.profile.profile_picture else None
            },
            'last_message': {
                'content': last_message.content if last_message else None,
                'message_type': last_message.message_type if last_message else None,
                'media_url': request.build_absolute_uri(last_message.media_file.url) if last_message and last_message.media_file else None,
                'timestamp': last_message.timestamp if last_message else None,
                'is_read': last_message.is_read if last_message else None
            } if last_message else None
        })
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_messages(request, user_id):
    try:
        # Check if users are connected
        if not Connection.objects.filter(
            (Q(sender=request.user, receiver_id=user_id) | Q(sender_id=user_id, receiver=request.user)),
            status='ACCEPTED'
        ).exists():
            return Response({'error': 'Users are not connected'}, status=status.HTTP_403_FORBIDDEN)

        # Get or create conversation
        conversation = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=user_id
        ).first()
        
        if not conversation:
            # Create new conversation
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, user_id)
        
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        
        # Mark messages as read
        messages.filter(sender_id=user_id, is_read=False).update(is_read=True)
        
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
