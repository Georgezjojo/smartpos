from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import OTP, AuditLog
from businesses.models import Business

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'phone', 'full_name', 'password', 'password2', 'business_name')
        extra_kwargs = {
            'email': {'required': False},
            'phone': {'required': False},
        }

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('phone'):
            raise serializers.ValidationError("Either email or phone number must be provided.")
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def validate_business_name(self, value):
        if Business.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A business with this name already exists.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone(self, value):
        if value and User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    def create(self, validated_data):
        business_name = validated_data.pop('business_name')
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        user.role = 'owner'
        user.save()
        business = Business.objects.create(name=business_name, owner=user)
        user.business = business
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        phone = attrs.get('phone')
        if not email and not phone:
            raise serializers.ValidationError("Provide email or phone.")
        return attrs


class OTPSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    code = serializers.CharField(max_length=6)
    purpose = serializers.CharField(max_length=20)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])


class UserSerializer(serializers.ModelSerializer):
    manager_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'phone', 'full_name', 'role', 'profile_picture',
                  'business', 'branch', 'branch_name', 'manager', 'manager_name', 'is_verified')
        read_only_fields = ('id', 'business')

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('full_name', 'phone', 'profile_picture')


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'