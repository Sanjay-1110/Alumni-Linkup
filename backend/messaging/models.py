from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ConversationManager(models.Manager):
    def get_or_create_conversation(self, user1_id, user2_id):
        conversation = self.filter(
            participants=user1_id
        ).filter(
            participants=user2_id
        ).first()
        
        if not conversation:
            conversation = self.create()
            conversation.participants.add(user1_id, user2_id)
        
        return conversation

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ConversationManager()

    class Meta:
        ordering = ['-updated_at']

    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()

class Message(models.Model):
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('gif', 'GIF'),
        ('file', 'File'),
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True
    )
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_messages',
        null=True,
        blank=True
    )
    content = models.TextField(blank=True)  # Can be empty if there's media
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    media_file = models.FileField(upload_to='messages/media/', null=True, blank=True)
    media_type = models.CharField(max_length=50, blank=True)  # For MIME type
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def save(self, *args, **kwargs):
        if self.receiver and not self.conversation:
            self.conversation = Conversation.objects.get_or_create_conversation(
                self.sender.id,
                self.receiver.id
            )
        super().save(*args, **kwargs)

    def __str__(self):
        if self.conversation:
            other_user = self.conversation.get_other_participant(self.sender)
            return f"{self.sender.username} -> {other_user.username}: {self.content[:50]}"
        return f"Message from {self.sender.username}: {self.content[:50]}"
