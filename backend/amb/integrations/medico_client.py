"""
MEDICO HTTP Client for AMB

This module provides the ONLY interface for AMB to communicate with MEDICO.
All communication happens via HTTP APIs - no shared models or database access.

Usage:
    from amb.integrations.medico_client import get_medico_client
    
    async with get_medico_client() as client:
        emergency = await client.create_emergency(payload)
        assignment = await client.assign_hospital(emergency["id"])
        await client.resolve_emergency(emergency["id"])

Architecture:
    AMB (Executor) ──HTTP──> MEDICO (System of Record)
    
    AMB NEVER:
    - Imports from app/
    - Accesses MEDICO database
    - Makes medical decisions
    
    MEDICO decides:
    - Hospital selection based on bed availability
    - Emergency severity classification
    - Bed assignments
"""

import logging
from typing import Optional, Any, Dict, List
from dataclasses import dataclass
from contextlib import asynccontextmanager

import httpx

logger = logging.getLogger("amb.integrations.medico")


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Default MEDICO API base URL (same server in unified deployment)
DEFAULT_MEDICO_BASE_URL = "http://127.0.0.1:8000"

# Timeout settings
DEFAULT_TIMEOUT = 30.0  # seconds


# ─────────────────────────────────────────────────────────────────────────────
# Response Models (AMB-owned, not shared with MEDICO)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EmergencyResponse:
    """Response from MEDICO emergency creation."""
    id: int
    status: str
    severity: str
    assigned_hospital_id: Optional[int] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EmergencyResponse":
        return cls(
            id=data.get("id"),
            status=data.get("status", "created"),
            severity=data.get("severity", "unknown"),
            assigned_hospital_id=data.get("assigned_hospital_id"),
        )


@dataclass
class HospitalAssignment:
    """Response from MEDICO hospital assignment."""
    emergency_id: int
    hospital_id: int
    hospital_name: str
    ward_type: Optional[str] = None
    bed_group_id: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "HospitalAssignment":
        return cls(
            emergency_id=data.get("emergency_id"),
            hospital_id=data.get("hospital_id"),
            hospital_name=data.get("hospital_name", "Unknown"),
            ward_type=data.get("ward_type"),
            bed_group_id=data.get("bed_group_id"),
            lat=data.get("lat"),
            lng=data.get("lng"),
        )


@dataclass 
class ResolutionResponse:
    """Response from MEDICO emergency resolution."""
    emergency_id: int
    status: str
    message: str
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ResolutionResponse":
        return cls(
            emergency_id=data.get("emergency_id") or data.get("id"),
            status=data.get("status", "resolved"),
            message=data.get("message", "Emergency resolved"),
        )


# ─────────────────────────────────────────────────────────────────────────────
# Error Handling
# ─────────────────────────────────────────────────────────────────────────────

class MedicoClientError(Exception):
    """Base exception for MEDICO client errors."""
    pass


class MedicoConnectionError(MedicoClientError):
    """Failed to connect to MEDICO."""
    pass


class MedicoAPIError(MedicoClientError):
    """MEDICO returned an error response."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"MEDICO API error {status_code}: {detail}")


# ─────────────────────────────────────────────────────────────────────────────
# HTTP Client
# ─────────────────────────────────────────────────────────────────────────────

class MedicoClient:
    """
    Async HTTP client for MEDICO API communication.
    
    This is the ONLY place where AMB communicates with MEDICO.
    All methods are async and handle errors gracefully.
    
    Example:
        async with MedicoClient() as client:
            emergency = await client.create_emergency({
                "severity": "critical",
                "location": "Chennai Central",
            })
    """
    
    def __init__(
        self,
        base_url: str = DEFAULT_MEDICO_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        role: str = "emergency_service",  # Default RBAC role for AMB
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.role = role
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self) -> "MedicoClient":
        """Enter async context."""
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "Content-Type": "application/json",
                "X-Role": self.role,
                "X-Source": "AMB",  # Identify requests from AMB
            },
        )
        logger.debug(f"MEDICO client connected to {self.base_url}")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit async context."""
        if self._client:
            await self._client.aclose()
            self._client = None
        logger.debug("MEDICO client disconnected")
    
    def _ensure_connected(self):
        """Ensure client is connected."""
        if not self._client:
            raise MedicoClientError(
                "Client not connected. Use 'async with MedicoClient() as client:'"
            )
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        json: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Make HTTP request to MEDICO with error handling.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (e.g., "/api/emergencies")
            json: Request body
            headers: Additional headers
            
        Returns:
            Response JSON as dict
            
        Raises:
            MedicoConnectionError: Failed to connect
            MedicoAPIError: MEDICO returned error response
        """
        self._ensure_connected()
        
        url = endpoint if endpoint.startswith("/") else f"/{endpoint}"
        
        try:
            logger.info(f"MEDICO request: {method} {url}")
            
            response = await self._client.request(
                method=method,
                url=url,
                json=json,
                headers=headers,
            )
            
            # Log response
            logger.info(f"MEDICO response: {response.status_code}")
            
            # Handle errors
            if response.status_code >= 400:
                try:
                    error_detail = response.json().get("detail", response.text)
                except Exception:
                    error_detail = response.text
                
                logger.error(f"MEDICO error: {response.status_code} - {error_detail}")
                raise MedicoAPIError(response.status_code, str(error_detail))
            
            # Parse response
            if response.status_code == 204:
                return {}
            
            return response.json()
            
        except httpx.ConnectError as e:
            logger.error(f"Failed to connect to MEDICO at {self.base_url}: {e}")
            raise MedicoConnectionError(f"Cannot connect to MEDICO: {e}")
        except httpx.TimeoutException as e:
            logger.error(f"MEDICO request timeout: {e}")
            raise MedicoConnectionError(f"MEDICO request timeout: {e}")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Emergency APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    async def create_emergency(
        self,
        payload: Dict[str, Any],
    ) -> EmergencyResponse:
        """
        Create a new emergency in MEDICO.
        
        AMB creates the emergency, MEDICO assigns the hospital.
        
        Args:
            payload: Emergency data, e.g.:
                {
                    "severity": "critical",
                    "location": "Chennai Central",
                    "caller_phone": "+91-9876543210",
                    "description": "Cardiac emergency"
                }
        
        Returns:
            EmergencyResponse with id and status
            
        Example:
            emergency = await client.create_emergency({
                "severity": "critical",
                "location": "13.0827, 80.2707",
            })
            print(f"Created emergency {emergency.id}")
        """
        logger.info(f"Creating emergency: severity={payload.get('severity')}")
        
        response = await self._request(
            method="POST",
            endpoint="/api/emergencies",
            json=payload,
        )
        
        result = EmergencyResponse.from_dict(response)
        logger.info(f"Emergency created: id={result.id}, status={result.status}")
        
        return result
    
    async def assign_hospital(
        self,
        emergency_id: int,
        hospital_id: int,
        bed_group_id: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> HospitalAssignment:
        """
        Request hospital assignment for an emergency from MEDICO.
        
        Dispatcher manually selects the hospital. MEDICO:
        - Validates bed availability
        - Reserves the bed
        - Updates hospital dashboard
        - Notifies hospital admin
        
        Args:
            emergency_id: MEDICO emergency ID
            hospital_id: Dispatcher-selected hospital ID
            bed_group_id: Optional bed group (ward) ID. If not provided,
                         MEDICO should auto-select based on severity.
            reason: Optional reason for assignment (audit trail)
            
        Returns:
            HospitalAssignment with hospital_id and coordinates
            
        Example:
            # Dispatcher selects hospital manually
            assignment = await client.assign_hospital(
                emergency_id=42,
                hospital_id=1,
                bed_group_id=3,  # ICU ward
                reason="Nearest hospital with ICU availability"
            )
            print(f"Route to: {assignment.hospital_name}")
        """
        logger.info(
            f"Requesting hospital assignment: emergency={emergency_id}, "
            f"hospital={hospital_id}, bed_group={bed_group_id}"
        )
        
        payload = {
            "hospital_id": hospital_id,
        }
        if bed_group_id is not None:
            payload["bed_group_id"] = bed_group_id
        if reason:
            payload["reason"] = reason
        
        response = await self._request(
            method="POST",
            endpoint=f"/api/control/emergencies/{emergency_id}/assign-hospital",
            json=payload,
        )
        
        result = HospitalAssignment.from_dict(response)
        logger.info(
            f"Hospital assigned: {result.hospital_name} (id={result.hospital_id}) "
            f"for emergency {result.emergency_id}"
        )
        
        return result
    
    async def resolve_emergency(
        self,
        emergency_id: int,
        resolution_notes: Optional[str] = None,
    ) -> ResolutionResponse:
        """
        Mark an emergency as resolved in MEDICO.
        
        Called when AMB completes patient delivery to hospital.
        MEDICO handles:
        - Releasing bed reservation
        - Updating emergency status
        - Emitting resolution events
        
        Args:
            emergency_id: MEDICO emergency ID
            resolution_notes: Optional notes about resolution
            
        Returns:
            ResolutionResponse with confirmation
            
        Example:
            await client.resolve_emergency(42, "Patient delivered successfully")
        """
        logger.info(f"Resolving emergency {emergency_id}")
        
        payload = {}
        if resolution_notes:
            payload["resolution_notes"] = resolution_notes
        
        response = await self._request(
            method="POST",
            endpoint=f"/api/emergencies/{emergency_id}/resolve",
            json=payload if payload else None,
        )
        
        result = ResolutionResponse.from_dict(response)
        logger.info(f"Emergency {emergency_id} resolved: {result.status}")
        
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # Hospital APIs
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_hospitals(self, skip: int = 0, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Fetch all hospitals from MEDICO.
        
        Use this to:
        - Verify AMB's hospital data matches MEDICO's
        - Get current hospital list on startup
        
        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum records to return
            
        Returns:
            List of hospital dictionaries with id, name, city, status
        """
        logger.info(f"Fetching hospitals from MEDICO (skip={skip}, limit={limit})")
        
        response = await self._request(
            method="GET",
            endpoint=f"/api/hospitals?skip={skip}&limit={limit}",
        )
        
        hospitals = response.get("items", [])
        logger.info(f"Retrieved {len(hospitals)} hospitals from MEDICO")
        
        return hospitals
    
    # ─────────────────────────────────────────────────────────────────────────
    # Health Check
    # ─────────────────────────────────────────────────────────────────────────
    
    async def health_check(self) -> bool:
        """
        Check if MEDICO is reachable and healthy.
        
        Returns:
            True if MEDICO is healthy, False otherwise
        """
        try:
            response = await self._request(
                method="GET",
                endpoint="/health",
            )
            return response.get("status") == "ok"
        except MedicoClientError:
            return False


# ─────────────────────────────────────────────────────────────────────────────
# Factory Function
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def get_medico_client(
    base_url: str = DEFAULT_MEDICO_BASE_URL,
    timeout: float = DEFAULT_TIMEOUT,
):
    """
    Factory function to get a MEDICO client as async context manager.
    
    Usage:
        async with get_medico_client() as client:
            emergency = await client.create_emergency(payload)
    
    Args:
        base_url: MEDICO API base URL
        timeout: Request timeout in seconds
        
    Yields:
        MedicoClient instance
    """
    client = MedicoClient(base_url=base_url, timeout=timeout)
    async with client as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# Singleton Instance (Optional)
# ─────────────────────────────────────────────────────────────────────────────

# Global client instance for reuse across requests
_global_client: Optional[MedicoClient] = None


async def init_global_client(base_url: str = DEFAULT_MEDICO_BASE_URL):
    """Initialize global MEDICO client (call at startup)."""
    global _global_client
    _global_client = MedicoClient(base_url=base_url)
    await _global_client.__aenter__()
    logger.info("Global MEDICO client initialized")


async def close_global_client():
    """Close global MEDICO client (call at shutdown)."""
    global _global_client
    if _global_client:
        await _global_client.__aexit__(None, None, None)
        _global_client = None
        logger.info("Global MEDICO client closed")


def get_global_client() -> MedicoClient:
    """
    Get the global MEDICO client instance.
    
    Raises:
        MedicoClientError: If global client not initialized
    """
    if not _global_client:
        raise MedicoClientError(
            "Global MEDICO client not initialized. "
            "Call init_global_client() at startup."
        )
    return _global_client
