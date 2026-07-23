import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guichet', '0003_guichet_affectations'),
        ('transport', '0009_platformconfiguration_company_commission_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='controlepassager',
            name='booking',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='controles_guichet',
                to='transport.booking',
            ),
        ),
    ]
