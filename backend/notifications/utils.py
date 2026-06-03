from .models import Notification

def create_notification(user, notif_type, title, body):
    Notification.objects.create(user=user, type=notif_type, title=title, body=body)

def notify_staff(notif_type, title, body, service_id=None):
    """
    Notify staff about a queue event.
    When service_id is given, only staff assigned to that service are notified
    (admins and super_admins always receive it since they oversee all services).
    """
    from accounts.models import User
    from django.db.models import Q
    if service_id is not None:
        qs = User.objects.filter(
            Q(role__in=['admin', 'super_admin']) |
            Q(role='staff', assigned_services=service_id)
        ).distinct()
    else:
        qs = User.objects.filter(role__in=['staff', 'admin', 'super_admin'])
    Notification.objects.bulk_create([
        Notification(user=u, type=notif_type, title=title, body=body, service_id=service_id)
        for u in qs
    ])
