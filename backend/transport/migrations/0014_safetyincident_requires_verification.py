from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0013_reservation_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='safetyincident',
            name='requires_verification',
            field=models.BooleanField(
                default=False,
                help_text='Vrai pour un signalement passager, jusqu’à sa prise en charge par la compagnie.',
            ),
        ),
    ]
