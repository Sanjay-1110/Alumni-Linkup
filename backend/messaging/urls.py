from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.get_conversations, name='get_conversations'),
    path('messages/<int:user_id>/', views.get_messages, name='get_messages'),
    path('upload-media/', views.upload_media, name='upload_media'),
] 