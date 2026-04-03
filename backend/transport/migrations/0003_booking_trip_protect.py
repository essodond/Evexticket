import django.db.models.deletion
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Change Booking.trip on_delete from CASCADE to PROTECT.
    This prevents accidental deletion of Trips that have existing Bookings.
    A Trip can only be deleted once all its Bookings are removed first.
    """

    dependencies = [
        ('transport', '0002_booking_scheduled_trip'),
    ]

    operations = [
        migrations.AlterField(
            model_name='booking',
            name='trip',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='bookings',
                to='transport.trip',
                verbose_name='Trajet',
            ),
        ),
    ]
