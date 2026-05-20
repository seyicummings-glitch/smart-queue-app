from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender_name',    models.CharField(max_length=150)),
                ('sender_role',    models.CharField(max_length=20)),
                ('recipient_role', models.CharField(max_length=20)),
                ('subject',        models.CharField(max_length=200)),
                ('body',           models.TextField()),
                ('created_at',     models.DateTimeField(auto_now_add=True)),
                ('sender',  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_staff_messages', to=settings.AUTH_USER_MODEL)),
                ('read_by', models.ManyToManyField(blank=True, related_name='read_staff_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
