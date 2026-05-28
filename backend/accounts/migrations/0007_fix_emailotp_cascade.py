from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_assigned_branch'),
    ]

    operations = [
        # Drop the old FK constraint and recreate it with ON DELETE CASCADE
        # so deleting a user also deletes their OTP records at the DB level.
        migrations.RunSQL(
            sql="""
                ALTER TABLE accounts_emailotp
                    DROP CONSTRAINT IF EXISTS accounts_emailotp_user_id_137ae83b_fk_accounts_user_id;

                ALTER TABLE accounts_emailotp
                    ADD CONSTRAINT accounts_emailotp_user_id_fk
                    FOREIGN KEY (user_id)
                    REFERENCES accounts_user(id)
                    ON DELETE CASCADE
                    DEFERRABLE INITIALLY DEFERRED;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
