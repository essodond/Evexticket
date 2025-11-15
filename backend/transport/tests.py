from django.test import TestCase
from .models import City

class CityModelTest(TestCase):
    def test_city_creation(self):
        city = City.objects.create(name="Test City", is_active=True)
        self.assertEqual(city.name, "Test City")
        self.assertTrue(city.is_active)
