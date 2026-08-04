from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('guichet', '0005_agence_coordinates'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venteguichet',
            name='statut',
            field=models.CharField(
                choices=[
                    ('valide', 'Valide'),
                    ('annule', 'Annule'),
                    ('rembourse', 'Rembourse'),
                    ('utilise', 'Utilise'),
                ],
                default='valide',
                max_length=10,
            ),
        ),
    ]
