from django.test import TestCase
from bins.models import Municipality, Zone, Depot, Bin, Vehicle, CollectionSchedule
from bins.routing.engine import _validate_and_build_problem, optimize_schedule_route
from bins.routing.problem import RoutingProblem, LocationInput, VehicleInput, RouteSequenceItem
from bins.routing.exceptions import RoutingValidationError, OptimizationFailedError
from datetime import date

class RoutingEngineTests(TestCase):
    def setUp(self):
        self.municipality = Municipality.objects.create(name='City Route')
        self.zone = Zone.objects.create(name='Zone Route', municipality=self.municipality)
        self.depot = Depot.objects.create(
            name='Route Depot',
            municipality=self.municipality,
            lat=10.0,
            lng=20.0
        )
        self.vehicle = Vehicle.objects.create(
            registration_number='ROUTE-VEH-1',
            capacity=15.0,
            municipality=self.municipality
        )
        self.bin1 = Bin.objects.create(
            bin_id='BIN-R1', municipality=self.municipality, lat=10.1, lng=20.1
        )
        self.bin2 = Bin.objects.create(
            bin_id='BIN-R2', municipality=self.municipality, lat=10.2, lng=20.2
        )
        self.schedule = CollectionSchedule.objects.create(
            schedule_id='SCH-R1',
            date=date.today(),
            municipality=self.municipality,
            zone=self.zone,
            depot=self.depot,
            vehicle=self.vehicle
        )
        self.schedule.bins.set([self.bin1, self.bin2])

    def test_validate_and_build_problem(self):
        problem = _validate_and_build_problem(self.schedule)
        self.assertIsInstance(problem, RoutingProblem)
        self.assertEqual(len(problem.bins), 2)
        self.assertTrue(problem.depot.is_depot)
        self.assertEqual(len(problem.vehicles), 1)
        self.assertEqual(problem.vehicles[0].id, str(self.vehicle.id))
        
        all_locations = problem.get_all_locations()
        self.assertEqual(len(all_locations), 3) # Depot + 2 bins
        self.assertEqual(all_locations[0].id, f"DEPOT_{self.depot.id}")

    def test_missing_depot_validation(self):
        self.schedule.depot = None
        self.schedule.save()
        with self.assertRaises(RoutingValidationError):
            _validate_and_build_problem(self.schedule)

    def test_missing_bins_validation(self):
        self.schedule.bins.clear()
        with self.assertRaises(RoutingValidationError):
            _validate_and_build_problem(self.schedule)

    def test_optimize_schedule_route_success(self):
        result = optimize_schedule_route(self.schedule)
        
        self.assertIsNotNone(result)
        self.assertEqual(len(result.routes), 1)
        
        route = result.routes[0]
        self.assertTrue(route.distance_km > 0)
        self.assertEqual(route.vehicle_id, str(self.vehicle.id))
        
        # Sequence: Depot -> Bin1/Bin2 -> Depot = 4 nodes
        self.assertEqual(len(route.sequence), 4)
        self.assertTrue(route.sequence[0].is_depot)
        self.assertTrue(route.sequence[-1].is_depot)
        
    def test_empty_route_fallback(self):
        # Even with one bin, sequence should be Depot -> Bin -> Depot
        self.schedule.bins.set([self.bin1])
        result = optimize_schedule_route(self.schedule)
        self.assertEqual(len(result.routes[0].sequence), 3)
