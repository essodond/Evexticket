from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.hashers import make_password


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        unique=True,
        db_index=True,
        verbose_name="Numéro de téléphone",
        help_text="Format canonique: 228XXXXXXXX (ex: 22890123456)"
    )
    pin = models.CharField(max_length=128, null=True, blank=True, verbose_name='PIN haché')

    class Meta:
        verbose_name = "Profil utilisateur"
        verbose_name_plural = "Profils utilisateurs"

    def __str__(self):
        return f"Profil de {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        profile = UserProfile.objects.create(user=instance)
        try:
            profile.pin = make_password('1234')
            profile.save()
        except Exception:
            pass


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Ensure profile exists and avoid recursion
    if not hasattr(instance, 'profile'):
        UserProfile.objects.create(user=instance)
    # Do not call instance.profile.save() here to avoid potential recursion
    