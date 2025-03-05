from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'graduation_year', 'department', 'is_verified')
        read_only_fields = ('is_verified',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'password', 'confirm_password', 'graduation_year', 'department')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'graduation_year': {'required': True},
            'department': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Remove confirm_password from the attributes
        attrs.pop('confirm_password', None)
        
        # Set username to email if not provided
        if 'username' not in attrs or not attrs['username']:
            attrs['username'] = attrs['email']
            
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    register_data = serializers.DictField(required=False, allow_null=True)

    def validate_register_data(self, value):
        if value is not None:
            required_fields = ['graduation_year', 'department']
            missing_fields = [field for field in required_fields if field not in value]
            if missing_fields:
                raise serializers.ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Validate graduation year
            try:
                graduation_year = int(value.get('graduation_year'))
                current_year = timezone.now().year
                if graduation_year < 1900 or graduation_year > current_year + 10:
                    raise serializers.ValidationError("Invalid graduation year")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Invalid graduation year format")
            
            # Validate department
            if value.get('department') not in dict(User.DEPARTMENT_CHOICES).keys():
                raise serializers.ValidationError("Invalid department")
                
        return value 