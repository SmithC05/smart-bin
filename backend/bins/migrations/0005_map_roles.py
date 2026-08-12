from django.db import migrations

def map_roles(apps, schema_editor):
    UserProfile = apps.get_model('bins', 'UserProfile')
    
    role_mapping = {
        'corporate': 'system_admin',
        'district_collector': 'municipal_admin',
        'municipal': 'municipal_officer',
        'driver': 'driver',
    }
    
    for profile in UserProfile.objects.all():
        if profile.role in role_mapping:
            profile.role = role_mapping[profile.role]
            profile.save()

def reverse_map_roles(apps, schema_editor):
    UserProfile = apps.get_model('bins', 'UserProfile')
    
    reverse_mapping = {
        'system_admin': 'corporate',
        'municipal_admin': 'district_collector',
        'municipal_officer': 'municipal',
        'driver': 'driver',
    }
    
    for profile in UserProfile.objects.all():
        if profile.role in reverse_mapping:
            profile.role = reverse_mapping[profile.role]
            profile.save()

class Migration(migrations.Migration):
    dependencies = [
        ('bins', '0004_municipality_ward_bin_legacy_zone_and_more'),
    ]

    operations = [
        migrations.RunPython(map_roles, reverse_map_roles),
    ]
