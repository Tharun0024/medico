# health check
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    """
    Health check endpoint.
    
    Returns a simple JSON response indicating the server is running.
    """
    return {"status": "ok"}
