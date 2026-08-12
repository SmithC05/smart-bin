from typing import List
from .problem import RoutingProblem, VehicleInput, LocationInput, RoutingResult
from .providers import HaversineMatrixProvider
from .solver import ORToolsSolver
from .exceptions import RoutingValidationError, OptimizationFailedError

def _validate_and_build_problem(schedule) -> RoutingProblem:
    if not schedule.depot:
        raise RoutingValidationError("Schedule must have an assigned depot.")
    if not schedule.depot.lat or not schedule.depot.lng:
        raise RoutingValidationError("Depot must have valid coordinates.")
        
    bins = schedule.bins.all()
    if not bins.exists():
        raise RoutingValidationError("Schedule must have at least one bin.")
        
    for b in bins:
        if not b.lat or not b.lng:
            raise RoutingValidationError(f"Bin {b.bin_id} is missing coordinates.")
            
    # For now, we only pass one vehicle from the schedule.
    # Architecture is ready for multiple vehicles in schedule.vehicles if that changes.
    vehicles_input = []
    if schedule.vehicle:
        vehicles_input.append(VehicleInput(
            id=str(schedule.vehicle.id),
            capacity=schedule.vehicle.capacity,
            capacity_unit=schedule.vehicle.capacity_unit
        ))
    else:
        # Fallback to a dummy vehicle if none assigned yet, though dispatch logic usually requires it.
        vehicles_input.append(VehicleInput(id="dummy_v1", capacity=100.0, capacity_unit="m3"))

    depot_input = LocationInput(
        id=f"DEPOT_{schedule.depot.id}",
        lat=schedule.depot.lat,
        lng=schedule.depot.lng,
        is_depot=True
    )
    
    bins_input = []
    for b in bins:
        latest = b.readings.first()
        fill_pct = latest.fill_pct if latest else 0.0
        bins_input.append(LocationInput(
            id=f"BIN_{b.id}",
            lat=b.lat,
            lng=b.lng,
            is_depot=False,
            fill_pct=fill_pct
        ))
        
    processing_input = None
    if schedule.processing_facility:
        if not schedule.processing_facility.lat or not schedule.processing_facility.lng:
            raise RoutingValidationError("Processing facility must have valid coordinates.")
        processing_input = LocationInput(
            id=f"PROC_{schedule.processing_facility.id}",
            lat=schedule.processing_facility.lat,
            lng=schedule.processing_facility.lng,
            is_processing_facility=True
        )
        
    return RoutingProblem(
        schedule_id=str(schedule.id),
        vehicles=vehicles_input,
        depot=depot_input,
        bins=bins_input,
        processing_facility=processing_input
    )

def optimize_schedule_route(schedule) -> RoutingResult:
    """
    Main entry point for routing optimization.
    Validates input models, constructs problem, solves it, and returns structured result.
    Does NOT save to DB.
    """
    problem = _validate_and_build_problem(schedule)
    
    # Initialize provider
    provider = HaversineMatrixProvider()
    
    # Initialize solver
    solver = ORToolsSolver(provider)
    
    # Solve
    result = solver.solve(problem)
    
    return result
