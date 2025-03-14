from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import action, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import requests as http_requests
from django.db.models import Q

from .serializers import UserSerializer, RegisterSerializer, GoogleAuthSerializer

User = get_user_model()

class AuthViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def get_permissions(self):
        if self.action in ['register', 'login', 'google_auth']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'register':
            return RegisterSerializer
        elif self.action == 'google_auth':
            return GoogleAuthSerializer
        return UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                # Create user as active
                user = serializer.save()
                
                # Generate tokens for immediate login
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'message': 'Registration successful!',
                    'user': UserSerializer(user).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email)
            user = authenticate(email=email, password=password)
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            else:
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
        except User.DoesNotExist:
            return Response({
                'error': 'No account found with this email'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def me(self, request):
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'])
    def google_auth(self, request):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Get user info using the access token
            access_token = serializer.validated_data['token']
            userinfo_url = 'https://www.googleapis.com/oauth2/v3/userinfo'
            headers = {'Authorization': f'Bearer {access_token}'}
            
            response = http_requests.get(userinfo_url, headers=headers)
            
            if response.status_code != 200:
                raise ValueError('Failed to get user info from Google')
            
            userinfo = response.json()
            print("Google userinfo:", userinfo)  # Debug print
            
            # Verify the user's email
            if not userinfo.get('email') or not userinfo.get('email_verified'):
                raise ValueError('Email not verified with Google')

            # Try to find existing user
            try:
                user = User.objects.get(email=userinfo['email'])
                # Update user's Google ID if not set
                if not user.google_id:
                    user.google_id = userinfo['sub']
                    user.save()
                
                # Generate JWT tokens for existing user
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'message': 'Successfully authenticated with Google'
                })
                
            except User.DoesNotExist:
                # User doesn't exist, check for registration data
                register_data = serializer.validated_data.get('register_data')
                if not register_data:
                    return Response({
                        'error': 'User does not exist',
                        'requires_registration': True,
                        'email': userinfo['email'],
                        'first_name': userinfo.get('given_name', ''),
                        'last_name': userinfo.get('family_name', '')
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create new user with Google data and registration data
                user = User.objects.create_user(
                    username=userinfo['email'],
                    email=userinfo['email'],
                    first_name=userinfo.get('given_name', ''),
                    last_name=userinfo.get('family_name', ''),
                    graduation_year=register_data.get('graduation_year'),
                    department=register_data.get('department'),
                    google_id=userinfo['sub'],
                    is_active=True
                )
                
                # Generate JWT tokens for new user
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'message': 'Successfully registered with Google'
                })

        except Exception as e:
            print(f"Google auth error: {str(e)}")
            import traceback
            print("Full traceback:", traceback.format_exc())
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            token = str(uuid.uuid4())
            user.reset_password_token = token
            user.reset_password_expires = timezone.now() + timedelta(hours=1)
            user.save()

            reset_link = f"http://localhost:5173/reset-password/{token}"
            send_mail(
                'Reset your LinkUp password',
                f'Click this link to reset your password: {reset_link}',
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )
            return Response({
                'message': 'Password reset instructions sent to your email'
            })
        except User.DoesNotExist:
            return Response({
                'error': 'No user found with this email'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        try:
            user = User.objects.get(
                reset_password_token=token,
                reset_password_expires__gt=timezone.now()
            )
            user.set_password(password)
            user.reset_password_token = ''
            user.reset_password_expires = None
            user.save()
            return Response({
                'message': 'Password reset successful'
            })
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid or expired reset token'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def network(self, request):
        """Get users based on filters"""
        try:
            # Get query parameters
            search_term = request.query_params.get('search', '').strip()
            graduation_year = request.query_params.get('graduation_year', '')
            
            # Start with all users except the current user
            queryset = User.objects.exclude(id=request.user.id)
            
            # Apply search if provided
            if search_term:
                queryset = queryset.filter(
                    Q(first_name__icontains=search_term) |
                    Q(last_name__icontains=search_term) |
                    Q(department__icontains=search_term)
                )
            
            # Apply graduation year filter if provided
            if graduation_year:
                queryset = queryset.filter(graduation_year=graduation_year)
            
            # Get batch mates (same department and graduation year)
            batch_mates = User.objects.filter(
                department=request.user.department,
                graduation_year=request.user.graduation_year
            ).exclude(id=request.user.id)
            
            # Get department-wise users
            department_users = {}
            departments = ['CSE', 'EEE', 'ECE', 'AGRI']  # Update with your departments
            
            # If searching, only include departments that match the search
            if search_term:
                departments = [d for d in departments if search_term.upper() in d]
            
            for dept in departments:
                dept_queryset = queryset.filter(department=dept)
                if dept_queryset.exists():
                    department_users[dept] = UserSerializer(dept_queryset, many=True).data
            
            return Response({
                'batch_mates': UserSerializer(batch_mates, many=True).data,
                'department_users': department_users,
                'filtered_users': UserSerializer(queryset, many=True).data
            })
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get', 'patch'])
    def profile(self, request, pk=None):
        try:
            user = self.get_object()
            if request.method == 'GET':
                data = UserSerializer(user).data
                data['is_followed_by_current_user'] = user.followers.filter(id=request.user.id).exists()
                return Response(data)
            
            elif request.method == 'PATCH' and request.user.id == user.id:
                # Handle profile picture upload
                if 'profile_pic' in request.FILES:
                    user.profile_pic = request.FILES['profile_pic']
                    user.save()
                    return Response(UserSerializer(user).data)
                
                # Handle JSON data
                serializer = UserSerializer(user, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def follow(self, request, pk=None):
        try:
            user_to_follow = self.get_object()
            if user_to_follow == request.user:
                return Response(
                    {'error': 'You cannot follow yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if request.user.following.filter(id=user_to_follow.id).exists():
                request.user.following.remove(user_to_follow)
                is_following = False
            else:
                request.user.following.add(user_to_follow)
                is_following = True

            return Response({
                'is_following': is_following,
                'follower_count': user_to_follow.followers.count(),
                'following_count': user_to_follow.following.count()
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

