from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'role', 'business', 'is_active', 'is_verified', 'created_at')
    list_filter = ('role', 'is_active', 'is_verified', 'business')
    search_fields = ('email', 'full_name', 'phone')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('full_name', 'phone', 'profile_picture')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Business info', {'fields': ('business', 'role', 'manager', 'branch')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'password1', 'password2', 'business', 'role', 'branch'),
        }),
    )

    readonly_fields = ('created_at', 'updated_at')