from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, verify_email

router = DefaultRouter()
router.register(r'', UserViewSet, basename='users')

urlpatterns = [
    path('verify_email/', verify_email, name='verify_email'),
    path('', include(router.urls)),
] 