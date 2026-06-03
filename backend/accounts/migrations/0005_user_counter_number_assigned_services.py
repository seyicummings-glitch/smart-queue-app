from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_date_of_birth'),
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='counter_number',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='assigned_services',
            field=models.ManyToManyField(
                blank=True,
                related_name='assigned_staff',
                to='services.service',
            ),
        ),
    ]
