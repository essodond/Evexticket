from django.db import migrations, models


def normalize_and_cleanup(apps, schema_editor):
    UserProfile = apps.get_model('transport', 'UserProfile')
    # Normalize phones to canonical '228'+8 digits and collect mapping
    profiles = list(UserProfile.objects.all())
    for p in profiles:
        phone = p.phone or ''
        digits = ''.join([c for c in str(phone) if c.isdigit()])
        if digits.startswith('228') and len(digits) == 11:
            canonical = digits
        elif len(digits) == 8:
            canonical = '228' + digits
        else:
            canonical = None
        if canonical != p.phone:
            p.phone = canonical
            p.save()

    # Deduplicate: keep the oldest profile (by id) for each phone, nullify others
    from collections import defaultdict
    mapping = defaultdict(list)
    for p in UserProfile.objects.filter(phone__isnull=False):
        mapping[p.phone].append(p)

    for phone, profs in mapping.items():
        if len(profs) > 1:
            profs.sort(key=lambda x: x.id)
            keeper = profs[0]
            for dup in profs[1:]:
                dup.phone = None
                dup.save()


class Migration(migrations.Migration):
    # Need non-transactional migration because we create index CONCURRENTLY
    atomic = False

    dependencies = [
        ('transport', '0005_comptecagnotte_reservation_historiquereversement_and_more'),
    ]

    operations = [
        migrations.RunPython(normalize_and_cleanup, reverse_code=migrations.RunPython.noop),
        # Create a unique index concurrently to enforce uniqueness without locking triggers
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS transport_userprofile_phone_uniq_idx
            ON transport_userprofile (phone);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS transport_userprofile_phone_uniq_idx;
            """,
        ),
    ]
