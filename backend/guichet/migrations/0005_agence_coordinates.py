from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('guichet', '0004_controlepassager_booking'),
    ]

    operations = [
        migrations.AddField(
            model_name='agence',
            name='latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                verbose_name='Latitude de la gare',
            ),
        ),
        migrations.AddField(
            model_name='agence',
            name='longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                verbose_name='Longitude de la gare',
            ),
        ),
    ]
