from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, AuthViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
    path('network/', AuthViewSet.as_view({'get': 'network'}), name='network'),
] 