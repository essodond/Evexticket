from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transref', models.CharField(db_index=True, max_length=64, unique=True)),
                ('method', models.CharField(choices=[('togocel', 'Togocel'), ('moov', 'Moov Togo'), ('card', 'Carte')], max_length=20)),
                ('phone', models.CharField(max_length=30)),
                ('amount', models.PositiveIntegerField()),
                ('firstname', models.CharField(max_length=100)),
                ('lastname', models.CharField(max_length=100)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('success', 'Succes'), ('failed', 'Echec'), ('insufficient_funds', 'Solde insuffisant'), ('system_error', 'Erreur systeme'), ('unknown', 'Inconnu')], default='pending', max_length=30)),
                ('qos_response_code', models.CharField(blank=True, max_length=10)),
                ('qos_response_message', models.TextField(blank=True)),
                ('qos_raw_response', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
