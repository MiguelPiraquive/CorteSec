from django.contrib import admin
from .models import Departamento, Municipio

@admin.register(Departamento)
class DepartamentoAdmin(admin.ModelAdmin):
    search_fields = ['nombre']

@admin.register(Municipio)
class MunicipioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'departamento']
    list_filter = ['departamento']
    search_fields = ['nombre']