from rest_framework import viewsets, permissions
from .models import Business, Branch
from .serializers import BusinessSerializer, BranchSerializer
from .permissions import IsBusinessOwner, IsOwnerOrManager


class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessOwner]
    queryset = Business.objects.none()

    def get_queryset(self):
        if self.request.user.role == 'owner':
            return Business.objects.filter(owner=self.request.user)
        return Business.objects.filter(pk=self.request.user.business_id)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManager]
    queryset = Branch.objects.none()

    def get_queryset(self):
        return Branch.objects.filter(business=self.request.user.business)

    def perform_create(self, serializer):
        # Auto‑assign the business from the logged‑in user
        serializer.save(business=self.request.user.business)