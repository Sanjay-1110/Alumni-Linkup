from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import User, Connection

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'department',
            'graduation_year', 'about', 'phone_number', 'profile_pic'
        ]
        read_only_fields = ['id', 'email']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    graduation_year = serializers.IntegerField(
        validators=[
            MinValueValidator(1900),
            MaxValueValidator(2100)
        ]
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'confirm_password', 'first_name', 'last_name',
            'department', 'graduation_year'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        
        # Remove confirm_password from the data
        data.pop('confirm_password')
        
        # Set username to email if not provided
        if not data.get('username'):
            data['username'] = data['email']
            
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            department=validated_data.get('department', ''),
            graduation_year=validated_data.get('graduation_year')
        )
        return user

class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField()
    register_data = serializers.DictField(required=False)

    def validate_register_data(self, value):
        if value:
            required_fields = ['graduation_year', 'department']
            for field in required_fields:
                if field not in value:
                    raise serializers.ValidationError(f"{field} is required")

            # Validate graduation_year
            try:
                year = int(value['graduation_year'])
                if not (1900 <= year <= 2100):
                    raise serializers.ValidationError("Invalid graduation year")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Invalid graduation year format")

            # Validate department
            if not value['department']:
                raise serializers.ValidationError("Department is required")

        return value

class ConnectionSerializer(serializers.ModelSerializer):
    sender_details = serializers.SerializerMethodField()
    receiver_details = serializers.SerializerMethodField()

    class Meta:
        model = Connection
        fields = ['id', 'sender', 'receiver', 'status', 'created_at', 'updated_at', 'sender_details', 'receiver_details']
        read_only_fields = ['created_at', 'updated_at']

    def get_sender_details(self, obj):
        return {
            'id': obj.sender.id,
            'email': obj.sender.email,
            'full_name': obj.sender.get_full_name(),
            'profile_pic': obj.sender.profile_pic.url if obj.sender.profile_pic else None
        }

    def get_receiver_details(self, obj):
        return {
            'id': obj.receiver.id,
            'email': obj.receiver.email,
            'full_name': obj.receiver.get_full_name(),
            'profile_pic': obj.receiver.profile_pic.url if obj.receiver.profile_pic else None
        } 