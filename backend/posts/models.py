from django.db import models
from django.conf import settings
from django.utils.text import slugify

class Post(models.Model):
    POST_TYPES = [
        ('TEXT', 'Text Post'),
        ('IMAGE', 'Image Post'),
        ('LINK', 'Link Share'),
        ('EVENT', 'Event Share'),
        ('PROJECT', 'Project Update'),
    ]
    
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    image = models.ImageField(upload_to='posts/', null=True, blank=True)
    post_type = models.CharField(max_length=10, choices=POST_TYPES, default='TEXT')
    external_link = models.URLField(null=True, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        
    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            # Create a unique slug
            base_slug = slugify(self.title)
            self.slug = base_slug
            # Check for uniqueness
            counter = 1
            while Post.objects.filter(slug=self.slug).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title or 'Post'} by {self.author.get_full_name() or self.author.username}"
        
    def get_likes_count(self):
        return self.likes.count()
        
    def get_comments_count(self):
        return self.comments.count()


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.get_full_name() or self.author.username}"

    @property
    def is_reply(self):
        return self.parent is not None


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['post', 'user']
        
    def __str__(self):
        return f"Like by {self.user.get_full_name() or self.user.username}"
