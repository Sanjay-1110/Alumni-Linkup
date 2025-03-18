from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Post, Comment, Like
from .serializers import (
    PostSerializer, 
    PostCreateUpdateSerializer,
    CommentSerializer, 
    CommentCreateSerializer,
    LikeSerializer
)
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta


class PostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing posts.
    """
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'author__username', 'author__first_name', 'author__last_name']
    ordering_fields = ['created_at', 'updated_at', 'views_count', 'likes_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Post.objects.all().select_related('author')
        
        # Include comment and like counts with different names to avoid conflict with properties
        queryset = queryset.annotate(
            likes_count_anno=Count('likes', distinct=True),
            comments_count_anno=Count('comments', distinct=True)
        )
        
        # For non-public posts, only show the user's own posts
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(is_public=True)
        else:
            queryset = queryset.filter(Q(is_public=True) | Q(author=self.request.user))
            
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        return PostSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'trending']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def user_feed(self, request):
        """Get posts from users that the current user follows"""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get posts from users the current user follows
        following_users = request.user.following.all()
        
        posts = Post.objects.filter(
            Q(author__in=following_users) | 
            Q(author=request.user)
        ).select_related('author').annotate(
            likes_count_anno=Count('likes', distinct=True),
            comments_count_anno=Count('comments', distinct=True)
        ).order_by('-created_at')
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending posts based on recent activity"""
        # Define what "recent" means - last 7 days
        recent_date = timezone.now() - timedelta(days=7)
        
        # Get posts with high engagement (views, likes, comments) in the recent period
        trending_posts = Post.objects.filter(
            created_at__gte=recent_date,
            is_public=True
        ).select_related('author').annotate(
            likes_count_anno=Count('likes', distinct=True),
            comments_count_anno=Count('comments', distinct=True),
            engagement_score=Count('likes', distinct=True) + Count('comments', distinct=True)*2 + (F('views_count')/10)
        ).order_by('-engagement_score')[:15]
        
        serializer = self.get_serializer(trending_posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """Get the current user's posts"""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        posts = self.get_queryset().filter(author=request.user)
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # By default, only get top-level comments (no replies)
        queryset = Comment.objects.filter(parent=None).select_related('author', 'post')
        
        # Filter by post if post_id is provided
        post_id = self.request.query_params.get('post_id', None)
        if post_id is not None:
            queryset = queryset.filter(post_id=post_id)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CommentCreateSerializer
        return CommentSerializer
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None):
        """Get replies to a specific comment"""
        comment = get_object_or_404(Comment, id=pk)
        replies = Comment.objects.filter(parent=comment).select_related('author')
        serializer = self.get_serializer(replies, many=True)
        return Response(serializer.data)


class LikeViewSet(viewsets.ModelViewSet):
    serializer_class = LikeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Like.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        post_id = request.data.get('post')
        if not post_id:
            return Response(
                {"error": "Post ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        post = get_object_or_404(Post, id=post_id)
        
        # Check if user already liked the post
        like, created = Like.objects.get_or_create(
            post=post,
            user=request.user
        )
        
        if not created:
            # User already liked the post, so unlike it
            like.delete()
            return Response(
                {"message": "Post unliked successfully"},
                status=status.HTTP_200_OK
            )
        
        serializer = self.get_serializer(like)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
