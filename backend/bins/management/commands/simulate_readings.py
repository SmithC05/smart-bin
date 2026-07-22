import random
import time

from django.core.management.base import BaseCommand

from bins.models import Bin, BinReading
from bins.views import _broadcast_update, _distance_from_fill, _sync_alert_for_reading


class Command(BaseCommand):
    help = 'Generate demo readings for active bins and broadcast WebSocket updates.'

    def add_arguments(self, parser):
        parser.add_argument('--bin-id', default=None)
        parser.add_argument('--fill-pct', type=float, default=None)
        parser.add_argument('--interval', type=float, default=0)
        parser.add_argument('--cycles', type=int, default=1)

    def handle(self, *args, **options):
        for cycle in range(options['cycles']):
            bins = Bin.objects.filter(is_active=True)
            if options['bin_id']:
                bins = bins.filter(bin_id=options['bin_id'])

            for bin_obj in bins:
                pct = options['fill_pct']
                if pct is None:
                    latest = bin_obj.readings.first()
                    base = latest.fill_pct if latest else random.randint(15, 70)
                    pct = max(0, min(100, base + random.randint(-8, 12)))

                reading = BinReading.objects.create(
                    bin=bin_obj,
                    fill_pct=pct,
                    distance_cm=_distance_from_fill(bin_obj, pct),
                )
                _sync_alert_for_reading(bin_obj, reading)
                _broadcast_update(bin_obj, reading)
                self.stdout.write(f'{bin_obj.bin_id}: {pct:.1f}%')

            if cycle < options['cycles'] - 1 and options['interval'] > 0:
                time.sleep(options['interval'])
