from rest_framework import serializers
from .models import Business, Branch

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'
        read_only_fields = ('business',)

class BusinessSerializer(serializers.ModelSerializer):
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Business
        fields = '__all__'
        read_only_fields = ('owner',)