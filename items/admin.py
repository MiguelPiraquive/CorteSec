from django.contrib import admin
from .models import Item

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "created_at")
    search_fields = ("name",)
    list_filter = ("created_at",)
    ordering = ("name",)