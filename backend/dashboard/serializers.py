# dashboard/serializers.py
"""
SERIALIZERS PARA DRF - DASHBOARD
=================================

Serializers para las APIs REST del dashboard.
"""

from rest_framework import serializers
from .models import Contractor, Project, Payment


class ContractorSerializer(serializers.ModelSerializer):
    """Serializer para contratistas"""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Contractor
        fields = [
            'id', 'employee_id', 'full_name', 'first_name', 'last_name',
            'email', 'phone', 'position', 'department', 'hire_date',
            'salary', 'status', 'address', 'emergency_contact',
            'emergency_phone', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer para proyectos"""
    
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status', 'priority',
            'budget', 'actual_cost', 'start_date', 'end_date',
            'estimated_completion', 'progress_percentage',
            'client_name', 'project_manager', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos"""
    
    contractor_name = serializers.CharField(source='contractor.full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'contractor', 'contractor_name', 'amount',
            'payment_date', 'payment_method', 'status',
            'description', 'reference', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContractorSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para contratistas (para listas)"""
    
    class Meta:
        model = Contractor
        fields = ['id', 'employee_id', 'full_name', 'position', 'status']


class ProjectSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para proyectos (para listas)"""
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'status', 'budget', 'progress_percentage']


class PaymentSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para pagos (para listas)"""
    
    contractor_name = serializers.CharField(source='contractor.full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'contractor_name', 'amount', 'payment_date', 'status']
