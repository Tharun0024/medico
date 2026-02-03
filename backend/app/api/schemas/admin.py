"""
Admin Dashboard Schemas

Pydantic models for admin dashboard responses.
"""

from pydantic import BaseModel


class SystemOverview(BaseModel):
    """Aggregated system-wide overview for Super Admin."""
    
    total_hospitals: int
    active_hospitals: int
    total_icu_capacity: int
    total_icu_available: int
    total_hdu_capacity: int
    total_hdu_available: int
    total_general_capacity: int
    total_general_available: int
    active_emergencies: int
    assigned_emergencies: int
    resolved_emergencies_today: int
    waste_alert_count: int


class HospitalPerformance(BaseModel):
    """Performance metrics for a single hospital."""
    
    hospital_id: int
    hospital_name: str
    city: str
    status: str
    total_capacity: int
    total_occupied: int
    occupancy_percentage: float
    icu_available: int
    icu_capacity: int
    active_emergencies_count: int


class HospitalPerformanceList(BaseModel):
    """List of hospital performance metrics."""
    
    items: list[HospitalPerformance]
    total: int
