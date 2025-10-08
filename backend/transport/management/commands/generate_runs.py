from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from transport.models import Trip, ScheduledTrip


class Command(BaseCommand):
    help = 'Génère les voyages (ScheduledTrip) pour les X prochains jours à partir des Trip actifs.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=14, help='Nombre de jours à générer (par défaut 14)')
        parser.add_argument('--start-offset', type=int, default=1, help='Offset en jours à partir d\'aujourd\'hui (par défaut 1 = demain)')

    def handle(self, *args, **options):
        days = options['days']
        start_offset = options['start_offset']

        today = timezone.localdate()
        start_date = today + timedelta(days=start_offset)
        end_date = start_date + timedelta(days=days - 1)

        qs = Trip.objects.filter(is_active=True)
        total_created = 0
        total_skipped = 0

        for trip in qs:
            for n in range(days):
                d = start_date + timedelta(days=n)
                obj, created = ScheduledTrip.objects.get_or_create(trip=trip, date=d, defaults={'is_active': True, 'available_seats': trip.capacity})
                if created:
                    total_created += 1
                else:
                    total_skipped += 1

        self.stdout.write(self.style.SUCCESS(f'Génération terminée: {total_created} créés, {total_skipped} existants.'))