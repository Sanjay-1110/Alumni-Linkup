from rest_framework import serializers
from .models import Post, Comment, Like
from django.contrib.auth import get_user_model

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'profile_pic']


class CommentSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)
    is_reply = serializers.BooleanField(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'parent', 'created_at', 'updated_at', 'is_reply', 'replies']
        read_only_fields = ['author', 'created_at', 'updated_at']
    
    def get_replies(self, obj):
        if hasattr(obj, 'replies'):
            return CommentBriefSerializer(obj.replies.all(), many=True).data
        return []


class CommentBriefSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at']


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['post', 'content', 'parent']


class LikeSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'post', 'user', 'created_at']
        read_only_fields = ['user', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    author = UserBriefSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    liked_by_user = serializers.SerializerMethodField()
    top_comments = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'author', 'title', 'content', 'image', 'post_type', 
            'external_link', 'is_public', 'created_at', 'updated_at', 
            'slug', 'views_count', 'comments_count', 'likes_count', 
            'liked_by_user', 'top_comments'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at', 'slug', 'views_count']
    
    def get_liked_by_user(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def get_comments_count(self, obj):
        if hasattr(obj, 'comments_count_anno'):
            return obj.comments_count_anno
        return obj.comments.count()
    
    def get_likes_count(self, obj):
        if hasattr(obj, 'likes_count_anno'):
            return obj.likes_count_anno
        return obj.likes.count()
    
    def get_top_comments(self, obj):
        # Get up to 3 top-level comments (non-replies)
        top_comments = obj.comments.filter(parent=None).order_by('-created_at')[:3]
        return CommentSerializer(top_comments, many=True, context=self.context).data


class PostCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['title', 'content', 'image', 'post_type', 'external_link', 'is_public'] 