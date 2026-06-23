from django.db import migrations, models
import django.contrib.auth.models
from django.contrib.auth.hashers import make_password


def set_default_pins(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('transport', 'UserProfile')
    for user in User.objects.all():
        profile, created = UserProfile.objects.get_or_create(user_id=user.id)
        if not profile.pin:
            profile.pin = make_password('1234')
            profile.save()


def reverse_set_default_pins(apps, schema_editor):
    # No-op on reverse; don't remove pins
    pass

class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('transport', '0005_comptecagnotte_reservation_historiquereversement_and_more'),
        ('auth', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='pin',
            field=models.CharField(max_length=128, null=True, blank=True, verbose_name='PIN hach\u00e9'),
        ),
        migrations.RunPython(set_default_pins, reverse_set_default_pins),
    ]
