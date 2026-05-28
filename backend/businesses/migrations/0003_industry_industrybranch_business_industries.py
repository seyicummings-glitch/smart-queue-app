from django.db import migrations, models
import django.db.models.deletion


def seed_builtin_industries(apps, schema_editor):
    Industry = apps.get_model('businesses', 'Industry')
    builtin = [
        ('banking',    'Banking',             'account-balance', '#2563eb'),
        ('healthcare', 'Healthcare',          'favorite',        '#e11d48'),
        ('retail',     'Retail',              'shopping-bag',    '#d97706'),
        ('government', 'Government Services', 'gavel',           '#475569'),
        ('education',  'Education',           'school',          '#4f46e5'),
        ('corporate',  'Corporate',           'business',        '#0d9488'),
    ]
    for key, label, icon, color in builtin:
        Industry.objects.get_or_create(
            key=key,
            defaults={
                'label':      label,
                'icon':       icon,
                'color':      color,
                'is_visible': True,
                'is_builtin': True,
            },
        )


def populate_business_industries(apps, schema_editor):
    Business  = apps.get_model('businesses', 'Business')
    Industry  = apps.get_model('businesses', 'Industry')
    for biz in Business.objects.all():
        if biz.industry:
            try:
                ind = Industry.objects.get(key=biz.industry)
                biz.industries.add(ind)
            except Industry.DoesNotExist:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('businesses', '0002_industrycontrol'),
    ]

    operations = [
        migrations.CreateModel(
            name='Industry',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key',        models.SlugField(max_length=50, unique=True)),
                ('label',      models.CharField(max_length=100)),
                ('icon',       models.CharField(default='business', max_length=50)),
                ('color',      models.CharField(default='#6B7280', max_length=20)),
                ('is_visible', models.BooleanField(default=True)),
                ('is_builtin', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name_plural': 'industries',
                'ordering': ['label'],
            },
        ),
        migrations.CreateModel(
            name='IndustryBranch',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name',       models.CharField(max_length=200)),
                ('address',    models.TextField(blank=True)),
                ('phone',      models.CharField(blank=True, max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('industry',   models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='branches',
                    to='businesses.industry',
                )),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='business',
            name='industries',
            field=models.ManyToManyField(blank=True, related_name='businesses', to='businesses.industry'),
        ),
        migrations.AlterField(
            model_name='business',
            name='industry',
            field=models.CharField(
                blank=True,
                choices=[
                    ('banking',    'Banking'),
                    ('healthcare', 'Healthcare'),
                    ('retail',     'Retail'),
                    ('government', 'Government'),
                    ('education',  'Education'),
                    ('corporate',  'Corporate'),
                ],
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='businessrequest',
            name='industry',
            field=models.CharField(max_length=100),
        ),
        migrations.RunPython(seed_builtin_industries, migrations.RunPython.noop),
        migrations.RunPython(populate_business_industries, migrations.RunPython.noop),
    ]
