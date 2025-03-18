from django.contrib import admin
from .models import Post, Comment, Like

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'post_type', 'created_at', 'views_count')
    list_filter = ('post_type', 'is_public', 'created_at')
    search_fields = ('title', 'content', 'author__username', 'author__email')
    readonly_fields = ('views_count',)
    date_hierarchy = 'created_at'

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'post', 'parent', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'author__username', 'author__email')

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'post__title')
