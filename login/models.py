from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    full_name = models.CharField(_("Full name"), max_length=150, blank=True)
    email = models.EmailField(_("Email address"), unique=True)
    phone = models.CharField(_("Phone"), max_length=20, blank=True)
    birth_date = models.DateField(_("Birth date"), blank=True, null=True)
    avatar = models.ImageField(_("Avatar"), upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(_("Biography"), blank=True)
    address = models.CharField(_("Address"), max_length=255, blank=True)
    city = models.CharField(_("City"), max_length=100, blank=True)
    country = models.CharField(_("Country"), max_length=100, blank=True)
    email_verified = models.BooleanField(_("Email verified"), default=False)
    is_active = models.BooleanField(_("Active"), default=True)
    is_staff = models.BooleanField(_("Staff status"), default=False)
    date_joined = models.DateTimeField(_("Date joined"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Last updated"), auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # username sigue siendo requerido por AbstractUser

    def __str__(self):
        return self.email or self.username

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")