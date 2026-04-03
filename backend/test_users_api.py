import os, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'togotrans_api.settings')
django.setup()

from django.test import RequestFactory
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from transport.views import UserViewSet

# Get admin user
admin = User.objects.filter(is_staff=True).first()
if not admin:
    print("ERROR: No staff user found!")
    exit(1)

print(f"Testing with user: {admin.username} (is_staff={admin.is_staff})")

# Get or create token
token, _ = Token.objects.get_or_create(user=admin)
print(f"Token: {token.key}")

# Simulate request
factory = RequestFactory()
request = factory.get('/api/users/')
request.user = admin

# Test the view
view = UserViewSet.as_view({'get': 'list'})
response = view(request)
response.render()

data = json.loads(response.content)
print(f"Status: {response.status_code}")
print(f"Users count: {len(data) if isinstance(data, list) else 'NOT A LIST'}")
if isinstance(data, list) and len(data) > 0:
    print(f"First user keys: {list(data[0].keys())}")
    print(f"First user: {data[0]}")
else:
    print(f"Response: {data}")

