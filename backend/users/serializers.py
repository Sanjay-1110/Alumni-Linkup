from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'graduation_year', 'department', 'is_active']
        read_only_fields = ['is_active']

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
        fields = ['email', 'username', 'password', 'confirm_password', 'first_name', 'last_name', 'graduation_year', 'department']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'graduation_year': {'required': True},
            'department': {'required': True}
        }

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
        return User.objects.create_user(**validated_data)

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