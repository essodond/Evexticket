"""
Commande de gestion Django pour créer toutes les grandes villes du Togo
Usage: python manage.py create_togo_cities
"""

from django.core.management.base import BaseCommand
from transport.models import City


class Command(BaseCommand):
    help = 'Crée toutes les grandes villes du Togo dans la base de données'

    # Liste des principales villes du Togo avec leurs régions
    TOGO_CITIES = [
        # Région Maritime
        {'name': 'Lomé', 'region': 'Maritime'},
        {'name': 'Kpalimé', 'region': 'Maritime'},
        {'name': 'Toliare', 'region': 'Maritime'},
        {'name': 'Tsévié', 'region': 'Maritime'},
        {'name': 'Vogan', 'region': 'Maritime'},
        {'name': 'Agbodrafo', 'region': 'Maritime'},
        
        # Région du Plateau
        {'name': 'Atakpamé', 'region': 'Plateau'},
        {'name': 'Badou', 'region': 'Plateau'},
        {'name': 'Notsé', 'region': 'Plateau'},
        {'name': 'Aného', 'region': 'Plateau'},
        {'name': 'Amlamé', 'region': 'Plateau'},
        {'name': 'Kéran', 'region': 'Plateau'},
        
        # Région du Centrale
        {'name': 'Sokodé', 'region': 'Centrale'},
        {'name': 'Tchamba', 'region': 'Centrale'},
        {'name': 'Kara', 'region': 'Centrale'},
        {'name': 'Sotouboua', 'region': 'Centrale'},
        {'name': 'Bassar', 'region': 'Centrale'},
        
        # Région de la Kara
        {'name': 'Kara', 'region': 'Kara'},
        {'name': 'Kanté', 'region': 'Kara'},
        {'name': 'Pagouda', 'region': 'Kara'},
        {'name': 'Assoli', 'region': 'Kara'},
        {'name': 'Kaboli', 'region': 'Kara'},
        {'name': 'Niamtougou', 'region': 'Kara'},
        
        # Région de la Savanes
        {'name': 'Dapaong', 'region': 'Savanes'},
        {'name': 'Mandouri', 'region': 'Savanes'},
        {'name': 'Kéran', 'region': 'Savanes'},
        {'name': 'Tandjouaré', 'region': 'Savanes'},
        {'name': 'Doufelgou', 'region': 'Savanes'},
        {'name': 'Cinkassé', 'region': 'Savanes'},
    ]

    def handle(self, *args, **options):
        """Exécute la création des villes"""
        created_count = 0
        updated_count = 0
        
        self.stdout.write(self.style.HTTP_INFO('\n🏙️  Création des villes du Togo...'))
        self.stdout.write(self.style.HTTP_INFO('=' * 50))
        
        for city_data in self.TOGO_CITIES:
            city, created = City.objects.get_or_create(
                name=city_data['name'],
                defaults={'region': city_data['region'], 'is_active': True}
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Créé: {city.name} - {city.region}')
                )
            else:
                # Mettre à jour la région si elle a changé
                if city.region != city_data['region']:
                    city.region = city_data['region']
                    city.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'⚠ Mis à jour: {city.name} - {city.region}')
                    )
                else:
                    self.stdout.write(
                        self.style.HTTP_INFO(f'- Existe déjà: {city.name}')
                    )
        
        # Afficher le résumé
        self.stdout.write(self.style.HTTP_INFO('=' * 50))
        self.stdout.write(self.style.SUCCESS(f'\n✅ Résumé:'))
        self.stdout.write(f'   Villes créées: {created_count}')
        self.stdout.write(f'   Villes mises à jour: {updated_count}')
        self.stdout.write(f'   Total villes: {City.objects.count()}\n')
