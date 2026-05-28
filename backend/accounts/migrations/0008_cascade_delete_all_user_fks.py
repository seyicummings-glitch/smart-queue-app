from django.db import migrations


# This migration finds every FK that points to accounts_user and sets
# ON DELETE CASCADE (or SET NULL for business ownership records).
# After this runs, deleting a user from Supabase dashboard or the app
# automatically removes all related rows — no manual cleanup needed.

_CASCADE_TABLES = [
    # (table, column)
    ('accounts_emailotp',                   'user_id'),
    ('token_blacklist_outstandingtoken',     'user_id'),
    ('accounts_user_groups',                'user_id'),
    ('accounts_user_user_permissions',      'user_id'),
    ('django_admin_log',                    'user_id'),
    ('appointments_appointment',            'customer_id'),
    ('queues_queueticket',                  'customer_id'),
    ('notifications_notification',          'user_id'),
    ('notifications_staffmessage',          'sender_id'),
]

_SET_NULL_TABLES = [
    # (table, column)  — keep the row but unlink the user
    ('businesses_businessrequest', 'reviewed_by_id'),
    ('businesses_business',        'owner_id'),
]


def _fix_fk(schema_editor, table, column, action):
    """Drop the existing FK and recreate it with the given ON DELETE action."""
    schema_editor.execute(f"""
        DO $$
        DECLARE
            cname text;
        BEGIN
            SELECT conname INTO cname
            FROM   pg_constraint c
            JOIN   pg_class      t ON t.oid = c.conrelid
            JOIN   pg_attribute  a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
            WHERE  t.relname  = '{table}'
              AND  a.attname  = '{column}'
              AND  c.contype  = 'f';

            IF cname IS NOT NULL THEN
                EXECUTE 'ALTER TABLE {table} DROP CONSTRAINT ' || quote_ident(cname);
            END IF;

            EXECUTE '
                ALTER TABLE {table}
                ADD CONSTRAINT {table}_{column}_auto_fk
                FOREIGN KEY ({column})
                REFERENCES accounts_user(id)
                ON DELETE {action}
            ';
        END $$;
    """)


def apply_cascades(apps, schema_editor):
    for table, col in _CASCADE_TABLES:
        try:
            _fix_fk(schema_editor, table, col, 'CASCADE')
        except Exception:
            pass  # table may not exist in all environments

    for table, col in _SET_NULL_TABLES:
        try:
            _fix_fk(schema_editor, table, col, 'SET NULL')
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_fix_emailotp_cascade'),
    ]

    operations = [
        migrations.RunPython(apply_cascades, migrations.RunPython.noop),
    ]
