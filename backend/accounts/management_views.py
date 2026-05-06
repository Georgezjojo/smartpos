from rest_framework import viewsets, permissions, status
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from .serializers import UserSerializer
User = get_user_model()

class UserManagementViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Only allow owners/managers to manage users
    # We'll restrict via queryset and custom permissions.
    def get_queryset(self):
        return User.objects.filter(business=self.request.user.business)
    def perform_create(self, serializer):
        # Assign business and default branch if needed
        serializer.save(business=self.request.user.business)