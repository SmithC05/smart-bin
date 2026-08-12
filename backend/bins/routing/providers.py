import math
from typing import List, Tuple
from abc import ABC, abstractmethod
from .problem import LocationInput

class RoutingMatrixProvider(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def compute_distance_matrix(self, locations: List[LocationInput]) -> List[List[int]]:
        """Returns distance matrix in meters (as integers for OR-Tools)"""
        pass

    @abstractmethod
    def compute_duration_matrix(self, locations: List[LocationInput]) -> List[List[int]]:
        """Returns duration matrix in seconds. Return empty list if unavailable."""
        pass
        
    @abstractmethod
    def travel_time_available(self) -> bool:
        pass

class HaversineMatrixProvider(RoutingMatrixProvider):
    def get_name(self) -> str:
        return "HAVERSINE"
        
    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> int:
        R = 6371000  # radius of Earth in meters
        phi_1 = math.radians(lat1)
        phi_2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return int(R * c)

    def compute_distance_matrix(self, locations: List[LocationInput]) -> List[List[int]]:
        num_locations = len(locations)
        matrix = [[0] * num_locations for _ in range(num_locations)]
        for i in range(num_locations):
            for j in range(num_locations):
                if i != j:
                    matrix[i][j] = self._haversine(
                        locations[i].lat, locations[i].lng,
                        locations[j].lat, locations[j].lng
                    )
        return matrix

    def compute_duration_matrix(self, locations: List[LocationInput]) -> List[List[int]]:
        return []
        
    def travel_time_available(self) -> bool:
        return False
