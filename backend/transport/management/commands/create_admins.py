from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from transport.models import Company


class Command(BaseCommand):
    help = 'Create a general admin user and a company FosterTrans with its company admin'

    def handle(self, *args, **options):
        # General admin
        general_username = 'superadmin'
        general_email = 'superadmin@evexticket.local'
        general_password = 'SuperAdmin123!'

        if User.objects.filter(username=general_username).exists():
            self.stdout.write(self.style.WARNING(f'Utilisateur {general_username} existe déjà.'))
        else:
            User.objects.create_superuser(username=general_username, email=general_email, password=general_password)
            self.stdout.write(self.style.SUCCESS(f'Admin général créé: {general_username} / {general_password}'))

        # Company FosterTrans and its admin
        company_name = 'FosterTrans'
        company_email = 'contact@fostertrans.local'

        company, created = Company.objects.get_or_create(
            name=company_name,
            defaults={
                'description': 'FosterTrans - compagnie de transport',
                'address': 'Siège FosterTrans',
                'phone': '+228 90 00 00 01',
                'email': company_email,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Compagnie créée: {company_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Compagnie {company_name} existe déjà.'))

        company_admin_username = 'foster_admin'
        company_admin_email = 'admin@fostertrans.local'
        company_admin_password = 'FosterAdmin123!'

        if User.objects.filter(username=company_admin_username).exists():
            self.stdout.write(self.style.WARNING(f'Utilisateur {company_admin_username} existe déjà. Lien avec la compagnie mis à jour.'))
            user = User.objects.get(username=company_admin_username)
        else:
            user = User.objects.create_user(username=company_admin_username, email=company_admin_email, password=company_admin_password, first_name='Foster', last_name='Admin')
            self.stdout.write(self.style.SUCCESS(f'Admin compagnie créé: {company_admin_username} / {company_admin_password}'))

        # Lier l'utilisateur en tant qu'admin principal et au groupe admins
        company.admin_user = user
        company.save()
        company.admins.add(user)
        company.save()

        self.stdout.write(self.style.SUCCESS(f'Utilisateur {user.username} lié comme administrateur de la compagnie {company.name}'))

        self.stdout.write('---')
        self.stdout.write('Comptes créés / mis à jour:')
        self.stdout.write(f'  Admin général: {general_username} ({general_email})')
        self.stdout.write(f'  Admin compagnie FosterTrans: {company_admin_username} ({company_admin_email})')
