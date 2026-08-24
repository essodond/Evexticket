from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transport', '0014_safetyincident_requires_verification'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reservation',
            name='statut_paiement',
            field=models.CharField(
                choices=[
                    ('en_attente', 'En attente'),
                    ('paye', 'Paye'),
                    ('echoue', 'Echoue'),
                    ('expire', 'Expire'),
                    ('rembourse', 'Rembourse'),
                    ('a_rapprocher', 'Paiement à rapprocher'),
                ],
                default='en_attente',
                max_length=20,
            ),
        ),
    ]
