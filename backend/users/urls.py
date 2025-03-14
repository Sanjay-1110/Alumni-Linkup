from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet

router = DefaultRouter()
router.register(r'', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/profile/', AuthViewSet.as_view({'get': 'profile', 'patch': 'profile'}), name='user-profile'),
    path('<int:pk>/follow/', AuthViewSet.as_view({'post': 'follow'}), name='user-follow'),
] 