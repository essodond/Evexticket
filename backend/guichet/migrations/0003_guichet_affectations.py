import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


def rattacher_gestionnaires_et_ventes(apps, schema_editor):
    Agence = apps.get_model('guichet', 'Agence')
    AgentGuichet = apps.get_model('guichet', 'AgentGuichet')
    VenteGuichet = apps.get_model('guichet', 'VenteGuichet')

    for agence in Agence.objects.exclude(gestionnaire_id=None):
        AgentGuichet.objects.filter(
            pk=agence.gestionnaire_id,
            agence_id=None,
        ).update(agence_id=agence.id)

    for vente in VenteGuichet.objects.select_related('agent').all():
        if vente.agent.agence_id:
            vente.agence_id = vente.agent.agence_id
            vente.guichet_id = vente.agent.guichet_id
            vente.save(update_fields=['agence', 'guichet'])


class Migration(migrations.Migration):

    dependencies = [
        ('guichet', '0002_agence'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Guichet',
            fields=[
                ('is_deleted', models.BooleanField(default=False)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=30)),
                ('nom', models.CharField(max_length=150)),
                ('emplacement', models.CharField(blank=True, max_length=200)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('agence', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='guichets', to='guichet.agence')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['code', 'nom']},
        ),
        migrations.AddConstraint(
            model_name='guichet',
            constraint=models.UniqueConstraint(
                condition=models.Q(('is_deleted', False)),
                fields=('agence', 'code'),
                name='unique_active_guichet_code_per_agence',
            ),
        ),
        migrations.AddField(
            model_name='agentguichet',
            name='agence',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='agents', to='guichet.agence'),
        ),
        migrations.AddField(
            model_name='agentguichet',
            name='guichet',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='agents', to='guichet.guichet'),
        ),
        migrations.AddField(
            model_name='venteguichet',
            name='agence',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ventes', to='guichet.agence'),
        ),
        migrations.AddField(
            model_name='venteguichet',
            name='guichet',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ventes', to='guichet.guichet'),
        ),
        migrations.RunPython(rattacher_gestionnaires_et_ventes, migrations.RunPython.noop),
    ]
