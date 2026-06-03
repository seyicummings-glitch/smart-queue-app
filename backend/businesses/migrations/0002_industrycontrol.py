from django.db import migrations, models


INDUSTRY_KEYS = ['banking', 'healthcare', 'retail', 'government', 'education', 'corporate']


def seed_industry_controls(apps, schema_editor):
    IndustryControl = apps.get_model('businesses', 'IndustryControl')
    for key in INDUSTRY_KEYS:
        IndustryControl.objects.get_or_create(industry=key, defaults={'is_visible': True})


class Migration(migrations.Migration):

    dependencies = [
        ('businesses', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='IndustryControl',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('industry',   models.CharField(choices=[('banking','Banking'),('healthcare','Healthcare'),('retail','Retail'),('government','Government'),('education','Education'),('corporate','Corporate')], max_length=50, unique=True)),
                ('is_visible', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['industry']},
        ),
        migrations.RunPython(seed_industry_controls, migrations.RunPython.noop),
    ]
