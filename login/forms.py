from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser

class LoginForm(forms.Form):
    username = forms.CharField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500',
            'placeholder': 'Correo electrónico'
        })
    )
    password = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500',
            'placeholder': 'Contraseña'
        })
    )

class RegisterForm(UserCreationForm):
    full_name = forms.CharField(
        label="Nombre completo",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Nombre completo'
        })
    )
    email = forms.EmailField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Correo electrónico'
        })
    )
    phone = forms.CharField(
        label="Teléfono",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Teléfono'
        })
    )
    birth_date = forms.DateField(
        label="Fecha de nacimiento",
        required=False,
        widget=forms.DateInput(attrs={
            'type': 'date',
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'
        })
    )
    avatar = forms.ImageField(
        label="Avatar",
        required=False,
        widget=forms.ClearableFileInput(attrs={
            'class': 'form-input w-full'
        })
    )
    bio = forms.CharField(
        label="Biografía",
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Cuéntanos algo sobre ti...',
            'rows': 3
        })
    )
    address = forms.CharField(
        label="Dirección",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Dirección'
        })
    )
    city = forms.CharField(
        label="Ciudad",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'Ciudad'
        })
    )
    country = forms.CharField(
        label="País",
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-input w-full px-4 py-2 rounded border border-gray-300',
            'placeholder': 'País'
        })
    )

    class Meta:
        model = CustomUser
        fields = (
            "username", "email", "full_name", "phone", "birth_date", "avatar",
            "bio", "address", "city", "country", "password1", "password2"
        )
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300', 'placeholder': 'Usuario'}),
        }

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("Ya existe un usuario con este correo electrónico.")
        return email

class ProfileForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = (
            "full_name", "email", "phone", "birth_date", "avatar",
            "bio", "address", "city", "country"
        )
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'email': forms.EmailInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'phone': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'birth_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'avatar': forms.ClearableFileInput(attrs={'class': 'form-input w-full'}),
            'bio': forms.Textarea(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300', 'rows': 3}),
            'address': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'city': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
            'country': forms.TextInput(attrs={'class': 'form-input w-full px-4 py-2 rounded border border-gray-300'}),
        }

    def clean_email(self):
        email = self.cleaned_data.get('email')
        user_id = self.instance.id
        if CustomUser.objects.filter(email=email).exclude(id=user_id).exists():
            raise forms.ValidationError("Ya existe un usuario con este correo electrónico.")