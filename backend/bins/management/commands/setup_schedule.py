from django.core.management.base import BaseCommand
from django_q.models import Schedule
from django_q.tasks import schedule

class Command(BaseCommand):
    help = 'Schedules the daily route generation task'

    def handle(self, *args, **kwargs):
        # Check if schedule already exists
        if Schedule.objects.filter(func='bins.tasks.generate_daily_routes').exists():
            self.stdout.write(self.style.WARNING('Schedule already exists for generate_daily_routes.'))
        else:
            schedule('bins.tasks.generate_daily_routes',
                     schedule_type=Schedule.DAILY,
                     time='06:00')
            self.stdout.write(self.style.SUCCESS('Successfully scheduled daily route generation.'))
