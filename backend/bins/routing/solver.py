from typing import List, Dict, Any
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from .problem import RoutingProblem, RoutingResult, RouteResult, RouteSequenceItem
from .providers import RoutingMatrixProvider
from .exceptions import OptimizationFailedError

class ORToolsSolver:
    def __init__(self, provider: RoutingMatrixProvider):
        self.provider = provider

    def solve(self, problem: RoutingProblem) -> RoutingResult:
        locations = problem.get_all_locations()
        
        # Currently, OR-Tools starts and ends at the same depot.
        # Depot is index 0.
        depot_index = 0
        num_vehicles = len(problem.vehicles)
        
        if len(locations) < 2:
            raise OptimizationFailedError("Not enough locations to optimize.")

        distance_matrix = self.provider.compute_distance_matrix(locations)

        data = {
            'distance_matrix': distance_matrix,
            'num_vehicles': num_vehicles,
            'depot': depot_index
        }

        manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']),
                                               data['num_vehicles'], data['depot'])
        
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['distance_matrix'][from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Basic CVRP preparation: if we have capacities in the future we can add dimension.
        # Currently, no dimension is added.

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
        
        # Allow time limit for robust operational execution
        search_parameters.time_limit.seconds = 5

        solution = routing.SolveWithParameters(search_parameters)
        
        if not solution:
            raise OptimizationFailedError("OR-Tools failed to find a solution.")

        routes = []
        total_distance = 0.0

        for vehicle_id_idx in range(data['num_vehicles']):
            index = routing.Start(vehicle_id_idx)
            sequence = []
            route_distance_m = 0
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                loc = locations[node_index]
                
                sequence.append(RouteSequenceItem(
                    location_id=loc.id,
                    is_depot=loc.is_depot,
                    is_processing_facility=loc.is_processing_facility
                ))
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance_m += routing.GetArcCostForVehicle(previous_index, index, vehicle_id_idx)
                
            # Add the final return to depot
            node_index = manager.IndexToNode(index)
            loc = locations[node_index]
            sequence.append(RouteSequenceItem(
                location_id=loc.id,
                is_depot=loc.is_depot,
                is_processing_facility=loc.is_processing_facility
            ))
            
            route_distance_km = route_distance_m / 1000.0
            total_distance += route_distance_km
            
            # Since problem.vehicles is a list, map vehicle_id_idx to the actual vehicle input
            vehicle_input = problem.vehicles[vehicle_id_idx] if problem.vehicles else None
            vid = vehicle_input.id if vehicle_input else str(vehicle_id_idx)

            # NOTE: We drop empty routes that just go Depot -> Depot.
            if len(sequence) > 2:
                routes.append(RouteResult(
                    vehicle_id=vid,
                    sequence=sequence,
                    distance_km=route_distance_km,
                    duration_min=None
                ))
        
        if not routes:
            raise OptimizationFailedError("Solver returned empty routes.")

        return RoutingResult(
            schedule_id=problem.schedule_id,
            routes=routes,
            total_distance_km=total_distance,
            travel_time_available=self.provider.travel_time_available(),
            optimization_method=f"OR-TOOLS / {self.provider.get_name()}",
            metadata={}
        )
