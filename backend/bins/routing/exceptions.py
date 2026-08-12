class RoutingError(Exception):
    """Base class for routing exceptions."""
    pass

class RoutingValidationError(RoutingError):
    """Raised when routing inputs are invalid or missing."""
    pass

class OptimizationFailedError(RoutingError):
    """Raised when the solver fails to find a valid route."""
    pass
