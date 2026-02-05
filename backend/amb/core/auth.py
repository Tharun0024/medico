from typing import Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from amb.core.startup import AMBULANCE_REGISTRY

security_scheme = HTTPBearer(auto_error=False)

# Simple in-memory token store: token -> ambulance dict
TOKEN_STORE: Dict[str, Dict[str, Any]] = {}


def issue_token_for_ambulance(ambulance: Dict[str, Any]) -> str:
    # For simplicity, use ambulance ID as token.
    # In a real system, replace with random string or JWT.
    token = f"amb-token-{ambulance['ambulance_id']}"
    TOKEN_STORE[token] = ambulance
    return token


async def get_current_ambulance(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> Dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    ambulance = TOKEN_STORE.get(token)
    if not ambulance:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return ambulance
