import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bins', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='bin',
            name='alert_threshold_pct',
            field=models.FloatField(default=80.0),
        ),
        migrations.AddField(
            model_name='bin',
            name='depth_cm',
            field=models.FloatField(default=40.0),
        ),
        migrations.AddField(
            model_name='bin',
            name='device_api_key',
            field=models.CharField(blank=True, default='', max_length=80),
        ),
        migrations.AddField(
            model_name='bin',
            name='route_threshold_pct',
            field=models.FloatField(default=60.0),
        ),
        migrations.CreateModel(
            name='AppSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=60, unique=True)),
                ('value', models.CharField(max_length=200)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['key'],
            },
        ),
        migrations.CreateModel(
            name='CollectionRoute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('status', models.CharField(choices=[('planned', 'Planned'), ('dispatched', 'Dispatched'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='planned', max_length=20)),
                ('optimized_order', models.JSONField(blank=True, default=list)),
                ('dispatched_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('bins', models.ManyToManyField(related_name='routes', to='bins.bin')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Alert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fill_pct', models.FloatField()),
                ('level', models.CharField(choices=[('danger', 'Danger'), ('warning', 'Warning')], default='danger', max_length=20)),
                ('status', models.CharField(choices=[('open', 'Open'), ('acknowledged', 'Acknowledged'), ('resolved', 'Resolved')], default='open', max_length=20)),
                ('message', models.CharField(max_length=200)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('bin', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='bins.bin')),
                ('reading', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='bins.binreading')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
