from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import LoginForm, RegisterForm, ProfileForm

def login_view(request):
    if request.user.is_authenticated:
        return redirect('payroll:nomina_lista')
    form = LoginForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = authenticate(
            request,
            email=form.cleaned_data['username'],  # Si usas email como USERNAME_FIELD
            password=form.cleaned_data['password']
        )
        if user is not None:
            login(request, user)
            messages.success(request, f"Bienvenido, {getattr(user, 'full_name', '') or user.get_username()}!")
            return redirect('payroll:nomina_lista')
        else:
            messages.error(request, "Usuario o contraseña incorrectos.")
    return render(request, 'login/login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, "Sesión cerrada correctamente.")
    return redirect('login:login')

def register_view(request):
    if request.user.is_authenticated:
        return redirect('payroll:nomina_lista')
    form = RegisterForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        login(request, user)
        messages.success(request, "Registro exitoso. ¡Bienvenido!")
        return redirect('payroll:nomina_lista')
    return render(request, 'login/register.html', {'form': form})

@login_required(login_url='login:login')
def profile_view(request):
    user = request.user
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "Perfil actualizado correctamente.")
            return redirect('login:profile')
    else:
        form = ProfileForm(instance=user)
    return render(request, 'login/profile.html', {'form': form})