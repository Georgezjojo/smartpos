from rest_framework import permissions

class IsBusinessOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user

class IsOwnerOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['owner', 'manager']