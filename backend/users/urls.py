from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet
from . import views

router = DefaultRouter()
router.register(r'', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/profile/', AuthViewSet.as_view({'get': 'profile', 'patch': 'profile'}), name='user-profile'),
    path('<int:pk>/follow/', AuthViewSet.as_view({'post': 'follow'}), name='user-follow'),
    path('connections/send/<int:user_id>/', views.send_connection_request, name='send_connection_request'),
    path('connections/handle/<int:connection_id>/', views.handle_connection_request, name='handle_connection_request'),
    path('connections/remove/<int:connection_id>/', views.remove_connection, name='remove_connection'),
    path('connections/requests/', views.get_connection_requests, name='get_connection_requests'),
    path('connections/', views.get_connections, name='get_connections'),
] 