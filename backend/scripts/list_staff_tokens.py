from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

staffs = User.objects.filter(is_staff=True)
print('staff count:', staffs.count())
for u in staffs:
    t = Token.objects.filter(user=u).first()
    print(u.id, u.username, 'token=' + (t.key if t else 'NO_TOKEN'))
