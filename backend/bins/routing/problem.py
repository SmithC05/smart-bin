from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class LocationInput:
    id: str
    lat: float
    lng: float
    is_depot: bool = False
    is_processing_facility: bool = False
    priority: str = 'NORMAL'
    fill_pct: float = 0.0

@dataclass
class VehicleInput:
    id: str
    capacity: float
    capacity_unit: str

@dataclass
class RoutingProblem:
    schedule_id: str
    vehicles: List[VehicleInput]
    depot: LocationInput
    bins: List[LocationInput]
    processing_facility: Optional[LocationInput] = None
    
    def get_all_locations(self) -> List[LocationInput]:
        # Order: Depot -> Bins -> Processing Facility (if exists) -> (Depot is implied at end)
        locs = [self.depot] + self.bins
        if self.processing_facility:
            locs.append(self.processing_facility)
        return locs

@dataclass
class RouteSequenceItem:
    location_id: str
    is_depot: bool = False
    is_processing_facility: bool = False

@dataclass
class RouteResult:
    vehicle_id: str
    sequence: List[RouteSequenceItem]
    distance_km: float
    duration_min: Optional[float] = None

@dataclass
class RoutingResult:
    schedule_id: str
    routes: List[RouteResult]
    total_distance_km: float
    travel_time_available: bool
    optimization_method: str
    metadata: Dict[str, Any] = field(default_factory=dict)
