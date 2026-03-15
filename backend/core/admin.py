from django.contrib import admin
from core.models import Plan, SearchHistory, SearchClick, Invitacion


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
	list_display = ('code', 'name', 'price_monthly_cop', 'price_yearly_cop', 'is_public', 'is_active', 'sort_order')
	list_filter = ('is_public', 'is_active')
	search_fields = ('code', 'name')
	ordering = ('sort_order', 'price_monthly_cop', 'name')


@admin.register(SearchHistory)
class SearchHistoryAdmin(admin.ModelAdmin):
	list_display = ('query', 'user', 'module', 'results_count', 'clicked_result', 'created_at')
	list_filter = ('module', 'clicked_result', 'created_at')
	search_fields = ('query', 'user__email', 'user__username')
	ordering = ('-created_at',)


@admin.register(SearchClick)
class SearchClickAdmin(admin.ModelAdmin):
	list_display = ('history', 'result_type', 'module', 'position', 'created_at')
	list_filter = ('module', 'result_type', 'created_at')
	search_fields = ('result_id', 'history__query')
	ordering = ('-created_at',)


@admin.register(Invitacion)
class InvitacionAdmin(admin.ModelAdmin):
	list_display = ('email', 'organization', 'role', 'estado', 'invited_by', 'expires_at', 'created_at')
	list_filter = ('estado', 'role', 'organization')
	search_fields = ('email', 'organization__nombre', 'invited_by__username')
	ordering = ('-created_at',)
	readonly_fields = ('token', 'accepted_at', 'accepted_by', 'created_at', 'updated_at')

