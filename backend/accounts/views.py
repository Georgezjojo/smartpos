import random, datetime
from django.utils import timezone
from django.conf import settings
from rest_framework import generics, status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from notifications.models import Notification

from .serializers import (
    RegisterSerializer, LoginSerializer, OTPSerializer,
    ChangePasswordSerializer, UserSerializer, ProfileUpdateSerializer, AuditLogSerializer
)
from .models import OTP, AuditLog
from .tasks import send_otp_email, send_otp_sms, send_welcome_email, send_welcome_sms

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        ip = xff.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# ========== REGISTER (passcode version) ==========
@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST'))
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # ---------- Passcode check ----------
        passcode = request.data.get('passcode', '')
        if passcode != settings.REGISTRATION_PASSCODE:
            return Response(
                {'passcode': 'Invalid registration passcode.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ---------- Create user ----------
        user = serializer.save()

        # Set user as verified (no OTP needed)
        user.is_verified = True
        user.save()

        # Generate JWT tokens
        tokens = get_tokens_for_user(user)
        AuditLog.objects.create(
            user=user,
            action='register',
            ip_address=get_client_ip(request)
        )

        # Welcome notification
        if not Notification.objects.filter(user=user, type='welcome').exists():
            Notification.objects.create(
                business=user.business,
                user=user,
                type='welcome',
                message=f'🎉 Welcome to SmartPOS, {user.full_name}! Your business "{user.business.name}" is all set up. Start exploring your dashboard, add products, and make your first sale!'
            )

        return Response({
            'message': 'Account created successfully. You are now logged in.',
            'tokens': tokens,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


# ========== LOGIN ==========
class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST'))
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get('email')
        phone = serializer.validated_data.get('phone')
        password = serializer.validated_data['password']

        user = None
        if email:
            user = User.objects.filter(email=email).first()
        elif phone:
            user = User.objects.filter(phone=phone).first()

        if user and user.check_password(password):
            if user.locked_until and user.locked_until > timezone.now():
                remaining = (user.locked_until - timezone.now()).seconds
                return Response({
                    'error': 'Account locked.',
                    'locked_seconds': remaining
                }, status=status.HTTP_423_LOCKED)

            user.failed_login_attempts = 0
            user.save()
            tokens = get_tokens_for_user(user)
            AuditLog.objects.create(user=user, action='login', ip_address=get_client_ip(request))

            # --- Welcome back in‑app (always) ---
            Notification.objects.create(
                business=user.business,
                user=user,
                type='system',
                message=f'Welcome back, {user.full_name}! You have successfully logged in.'
            )

            # --- First‑login special welcome (only once) ---
            if not Notification.objects.filter(user=user, type='welcome').exists():
                Notification.objects.create(
                    business=user.business,
                    user=user,
                    type='welcome',
                    message=f'🎉 Welcome to SmartPOS, {user.full_name}! Your business "{user.business.name}" is all set up. Start exploring your dashboard, add products, and make your first sale!'
                )
                # Send email and SMS via Celery
                send_welcome_email.delay(user.email, user.full_name)
                send_welcome_sms.delay(user.phone, user.full_name)

            return Response({
                'tokens': tokens,
                'user': UserSerializer(user).data
            })

        else:
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = timezone.now() + datetime.timedelta(minutes=15)
                user.save()
            AuditLog.objects.create(action='failed_login', ip_address=get_client_ip(request))
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# ========== OTP ==========
class OTPVerifyView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']
        code = serializer.validated_data['code']
        purpose = serializer.validated_data['purpose']
        try:
            otp = OTP.objects.filter(user_id=user_id, code=code, purpose=purpose, is_used=False).latest('created_at')
        except OTP.DoesNotExist:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        if otp.expires_at < timezone.now():
            return Response({'error': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)
        otp.is_used = True
        otp.save()
        user = otp.user
        if purpose == 'signup':
            user.is_verified = True
            user.save()
            tokens = get_tokens_for_user(user)
            return Response({'tokens': tokens, 'message': 'Account verified'})
        elif purpose == 'password_reset':
            reset_token = RefreshToken.for_user(user).access_token
            return Response({'reset_token': str(reset_token), 'message': 'OTP verified. Proceed to reset password.'})
        return Response({'message': 'OTP verified'})


# ========== PROFILE ==========
class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = ProfileUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        AuditLog.objects.create(user=request.user, action='profile_update', ip_address=get_client_ip(request))
        return Response(UserSerializer(instance).data)


# ========== CHANGE PASSWORD ==========
class ChangePasswordView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': 'Wrong password.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        AuditLog.objects.create(user=user, action='password_change', ip_address=get_client_ip(request))
        return Response({'message': 'Password changed successfully'})


# ========== FORGOT PASSWORD ==========
class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ratelimit(key='ip', rate='3/m', method='POST'))
    def post(self, request):
        email = request.data.get('email')
        phone = request.data.get('phone')
        if not email and not phone:
            return Response({'error': 'Provide email or phone'}, status=400)
        user = None
        if email:
            user = User.objects.filter(email=email).first()
        else:
            user = User.objects.filter(phone=phone).first()
        if not user:
            return Response({'error': 'User not found'}, status=404)
        otp_code = str(random.randint(100000, 999999))
        OTP.objects.create(user=user, code=otp_code, purpose='password_reset',
                           expires_at=timezone.now() + datetime.timedelta(seconds=100))
        if user.email:
            send_otp_email.delay(user.email, otp_code)
        if user.phone:
            send_otp_sms.delay(user.phone, otp_code)
        return Response({'user_id': str(user.id), 'message': 'OTP sent'})


# ========== USER MANAGEMENT ==========
class UserListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'owner':
            return User.objects.filter(business=user.business)
        elif user.role == 'manager':
            return User.objects.filter(manager=user)
        else:
            return User.objects.filter(pk=user.pk)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.business)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'owner':
            return User.objects.filter(business=user.business)
        elif user.role == 'manager':
            return User.objects.filter(manager=user)
        else:
            return User.objects.filter(pk=user.pk)