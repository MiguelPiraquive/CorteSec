from django.contrib import admin
from .models import Contractor, Project, Payment

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "company")
    search_fields = ("first_name", "last_name", "email", "company")
    list_filter = ("company",)
    ordering = ("last_name", "first_name")

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "contractor", "start_date", "end_date")
    search_fields = ("name", "contractor__first_name", "contractor__last_name")
    list_filter = ("start_date", "end_date")
    ordering = ("-start_date",)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("project", "amount", "payment_date")
    search_fields = ("project__name",)
    list_filter = ("payment_date",)
    ordering = ("-payment_date",)