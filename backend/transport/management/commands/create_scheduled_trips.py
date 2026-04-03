"""
Management command: create_scheduled_trips
==========================================
Génère les ScheduledTrip manquants pour tous les Trips actifs sur N jours à partir d'aujourd'hui.

Usage:
    python manage.py create_scheduled_trips            # 30 jours par défaut
    python manage.py create_scheduled_trips --days=60  # 60 jours
    python manage.py create_scheduled_trips --days=14 --company=3  # seulement la compagnie 3

À intégrer dans un cron job (par ex. quotidien) pour que les trajets soient toujours
disponibles à la réservation :
    0 1 * * * /path/to/venv/bin/python /path/to/manage.py create_scheduled_trips --days=30
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from transport.models import Trip, ScheduledTrip


class Command(BaseCommand):
    help = 'Génère les ScheduledTrip manquants pour les N prochains jours (défaut: 30).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Nombre de jours à couvrir à partir d\'aujourd\'hui (défaut: 30).',
        )
        parser.add_argument(
            '--company',
            type=int,
            default=None,
            help='Limiter à une compagnie spécifique (ID).',
        )

    def handle(self, *args, **options):
        days = options['days']
        company_id = options.get('company')

        trips_qs = Trip.objects.filter(is_active=True).select_related('company')
        if company_id:
            trips_qs = trips_qs.filter(company_id=company_id)

        today = timezone.localdate()
        created_total = 0
        skipped_total = 0

        for trip in trips_qs:
            created_count = 0
            for n in range(days):
                d = today + timedelta(days=n)
                _, created = ScheduledTrip.objects.get_or_create(
                    trip=trip,
                    date=d,
                    defaults={
                        'is_active': True,
                        'available_seats': trip.capacity,
                    },
                )
                if created:
                    created_count += 1
                else:
                    skipped_total += 1

            if created_count:
                self.stdout.write(
                    f'  Trip {trip.id} ({trip.departure_city} → {trip.arrival_city}): '
                    f'+{created_count} ScheduledTrip(s) créé(s)'
                )
            created_total += created_count

        self.stdout.write(
            self.style.SUCCESS(
                f'\nTerminé. {created_total} ScheduledTrip(s) créé(s), {skipped_total} déjà existant(s).'
            )
        )
