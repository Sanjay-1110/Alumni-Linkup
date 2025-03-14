from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    DEPARTMENT_CHOICES = [
        ('CSE', 'Computer Science and Engineering'),
        ('EEE', 'Electrical and Electronics Engineering'),
        ('ECE', 'Electronics and Communication Engineering'),
        ('AGRI', 'Agriculture'),
    ]

    email = models.EmailField(unique=True)
    department = models.CharField(max_length=50, null=True, blank=True)
    graduation_year = models.IntegerField(null=True, blank=True)
    google_id = models.CharField(max_length=255, null=True, blank=True, default='')
    reset_password_token = models.CharField(max_length=255, null=True, blank=True, default='')
    reset_password_expires = models.DateTimeField(null=True, blank=True)
    
    # Profile fields
    about = models.TextField(blank=True, default='')
    phone_number = models.CharField(max_length=20, blank=True, default='')
    profile_pic = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    # Following relationship
    following = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='followers',
        blank=True
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

class Connection(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]
    
    sender = models.ForeignKey(User, related_name='sent_connections', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_connections', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['sender', 'receiver']

    def __str__(self):
        return f"{self.sender.email} -> {self.receiver.email} ({self.status})"
