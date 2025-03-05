from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests
import os

from .serializers import UserSerializer, RegisterSerializer, GoogleAuthSerializer

User = get_user_model()

class AuthViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'register':
            return RegisterSerializer
        elif self.action == 'google_auth':
            return GoogleAuthSerializer
        return UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        try:
            print("Registration data received:", request.data)  # Debug print
            serializer = self.get_serializer(data=request.data)
            
            if not serializer.is_valid():
                print("Validation errors:", serializer.errors)  # Debug print
                return Response(
                    {
                        'error': serializer.errors,
                        'message': 'Invalid registration data'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Registration successful!'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Registration error: {str(e)}")  # Debug print
            import traceback
            print("Full traceback:", traceback.format_exc())  # Debug print
            return Response({
                'error': str(e),
                'message': 'Registration failed'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({
                'detail': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)
        if not user:
            return Response({
                'detail': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })

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
            try:
                access_token = serializer.validated_data['token']
                userinfo_url = 'https://www.googleapis.com/oauth2/v3/userinfo'
                headers = {'Authorization': f'Bearer {access_token}'}
                
                import requests as http_requests
                response = http_requests.get(userinfo_url, headers=headers)
                if response.status_code != 200:
                    raise ValueError('Failed to get user info from Google')
                
                userinfo = response.json()
                print("Google user info:", userinfo)  # Debug print
                
                # Verify the user's email
                if not userinfo.get('email') or not userinfo.get('email_verified'):
                    raise ValueError('Email not verified with Google')

            except Exception as e:
                print(f"Google API error: {str(e)}")
                return Response({
                    'error': 'Failed to verify Google token',
                    'detail': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

            # Try to find existing user
            try:
                user = User.objects.get(email=userinfo['email'])
                # Update user's Google ID if not set
                if not user.google_id:
                    user.google_id = userinfo['sub']
                    user.save()
            except User.DoesNotExist:
                # If user doesn't exist, check if we have registration data
                register_data = serializer.validated_data.get('register_data')
                if not register_data:
                    return Response({
                        'error': 'User does not exist',
                        'requires_registration': True,
                        'email': userinfo['email']
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
                    is_verified=True
                )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Successfully authenticated with Google'
            })

        except Exception as e:
            print(f"Google auth error: {str(e)}")
            import traceback
            print("Full traceback:", traceback.format_exc())
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def verify_email(self, request):
        token = request.query_params.get('token')
        try:
            user = User.objects.get(verification_token=token)
            user.is_verified = True
            user.verification_token = ''
            user.save()
            return Response({
                'message': 'Email verified successfully'
            })
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid verification token'
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
