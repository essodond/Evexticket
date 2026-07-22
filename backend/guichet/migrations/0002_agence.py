import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('guichet', '0001_initial'),
        ('transport', '0008_alter_userprofile_phone'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Agence',
            fields=[
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('nom', models.CharField(max_length=200)),
                ('adresse', models.CharField(max_length=300)),
                ('telephone', models.CharField(max_length=30)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('compagnie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='agences', to='transport.company')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('gestionnaire', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='agences_gerees', to='guichet.agentguichet')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('ville', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='agences', to='transport.city')),
            ],
            options={'ordering': ['nom']},
        ),
        migrations.AddConstraint(
            model_name='agence',
            constraint=models.UniqueConstraint(condition=models.Q(('is_deleted', False)), fields=('compagnie', 'nom'), name='unique_active_agence_name_per_company'),
        ),
    ]
