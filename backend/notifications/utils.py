from .models import Notification

def create_notification(user, notif_type, title, body):
    Notification.objects.create(user=user, type=notif_type, title=title, body=body)

def notify_staff(notif_type, title, body):
    from accounts.models import User
    staff = User.objects.filter(role__in=['staff', 'admin', 'super_admin'])
    Notification.objects.bulk_create([
        Notification(user=u, type=notif_type, title=title, body=body)
        for u in staff
    ])
