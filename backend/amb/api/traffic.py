# backend/app/api/traffic.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from amb.services.gps_simulator import get_latest_traffic
from amb.core.auth import get_current_ambulance  # existing Phase 1


router = APIRouter(prefix="/traffic", tags=["traffic"])


class TrafficSnapshotResponse(BaseModel):
    congestion_level: str
    incident: str | None
    estimated_clearance_minutes: int
    confidence: float
    generated_at: str


@router.get("/latest", response_model=TrafficSnapshotResponse)
def get_latest_traffic_snapshot(
    current_ambulance=Depends(get_current_ambulance),
):
    ambulance_id: str = current_ambulance["ambulance_id"]
    snapshot = get_latest_traffic(ambulance_id)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No traffic snapshot available yet",
        )

    return TrafficSnapshotResponse(**snapshot.to_dict())
