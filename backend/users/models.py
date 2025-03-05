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

    email = models.EmailField(_('email address'), unique=True)
    graduation_year = models.IntegerField(null=True, blank=True)
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES, null=True, blank=True)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True)
    
    # Fields for password reset
    reset_password_token = models.CharField(max_length=100, blank=True)
    reset_password_expires = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.email
