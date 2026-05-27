from django.db import migrations, models
import django.db.models.deletion


def delete_stale_staff_queue_notifications(apps, schema_editor):
    """
    Remove old queue notifications sent to staff before service-based
    filtering was added.  These have no service tag so we cannot tell
    if they are relevant — safest to delete them so staff start clean.
    """
    Notification = apps.get_model('notifications', 'Notification')
    User         = apps.get_model('accounts', 'User')
    staff_ids = User.objects.filter(role='staff').values_list('id', flat=True)
    Notification.objects.filter(
        type='queue',
        service__isnull=True,
        user_id__in=list(staff_ids),
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_staffmessagereply'),
        ('services',      '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='service',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notifications',
                to='services.service',
            ),
        ),
        migrations.RunPython(
            delete_stale_staff_queue_notifications,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
