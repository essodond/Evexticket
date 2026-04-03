import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'togotrans_api.settings')
django.setup()

from transport.models import UserProfile
print("UserProfile fields:", [f.name for f in UserProfile._meta.get_fields()])

from transport.models import TripStop
print("TripStop fields:", [f.name for f in TripStop._meta.get_fields()])

