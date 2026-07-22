import decimal
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0008_alter_userprofile_phone'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='commission_rate',
            field=models.DecimalField(
                decimal_places=2,
                default=10.00,
                max_digits=5,
                validators=[
                    django.core.validators.MinValueValidator(decimal.Decimal('0')),
                    django.core.validators.MaxValueValidator(decimal.Decimal('100')),
                ],
                verbose_name='Commission EVEX (%)',
            ),
        ),
        migrations.CreateModel(
            name='PlatformConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service_fee', models.PositiveIntegerField(default=300, verbose_name='Frais de service (FCFA)')),
                ('default_commission_rate', models.DecimalField(
                    decimal_places=2,
                    default=10.00,
                    max_digits=5,
                    validators=[
                        django.core.validators.MinValueValidator(decimal.Decimal('0')),
                        django.core.validators.MaxValueValidator(decimal.Decimal('100')),
                    ],
                    verbose_name='Commission par défaut (%)',
                )),
                ('cancellation_delay_hours', models.PositiveIntegerField(default=2, verbose_name="Délai minimal d'annulation (heures)")),
                ('email_notifications', models.BooleanField(default=True)),
                ('sms_notifications', models.BooleanField(default=True)),
                ('maintenance_mode', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Configuration de la plateforme',
                'verbose_name_plural': 'Configuration de la plateforme',
            },
        ),
    ]
