from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status, Depends

from amb.core.startup import AMBULANCE_REGISTRY
from amb.core.auth import issue_token_for_ambulance, get_current_ambulance


router = APIRouter(prefix="/ambulance", tags=["ambulance"])


class AmbulanceRegisterRequest(BaseModel):
    ambulance_id: str
    secret: str


class AmbulanceTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AmbulanceMeResponse(BaseModel):
    id: str
    plate_number: str
    hospital_id: str


@router.post("/register", response_model=AmbulanceTokenResponse)
def register_ambulance(payload: AmbulanceRegisterRequest):
    ambulance = AMBULANCE_REGISTRY.get(payload.ambulance_id)
    if not ambulance or ambulance.get("secret") != payload.secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ambulance credentials",
        )

    token = issue_token_for_ambulance(ambulance)
    return AmbulanceTokenResponse(access_token=token)


@router.get("/me", response_model=AmbulanceMeResponse)
def get_me(current_ambulance=Depends(get_current_ambulance)):
    return AmbulanceMeResponse(
        id=current_ambulance["ambulance_id"],
        plate_number=current_ambulance["plate_number"],
        hospital_id=current_ambulance["hospital_id"],
    )
