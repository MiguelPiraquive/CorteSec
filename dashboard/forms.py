from django import forms
from .models import Contractor, Project, Payment

class ContractorForm(forms.ModelForm):
    class Meta:
        model = Contractor
        fields = "__all__"

class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = "__all__"

class PaymentForm(forms.ModelForm):
    class Meta:
        model = Payment
        fields = "__all__"