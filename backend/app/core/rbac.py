"""
MEDICO Role-Based Access Control

Lightweight RBAC using request headers.
No authentication - just role context for dashboard filtering.
"""

from enum import Enum
from typing import Optional, Callable
from dataclasses import dataclass

from fastapi import Header, HTTPException, status, Depends


class UserRole(str, Enum):
    """User roles for dashboard access."""
    
    SUPER_ADMIN = "super_admin"          # Government / Authority
    HOSPITAL_ADMIN = "hospital_admin"    # Hospital-specific admin
    MEDICAL_STAFF = "medical_staff"      # Ward-level staff
    WASTE_TEAM = "waste_team"            # Waste management team
    EMERGENCY_SERVICE = "emergency_service"  # Emergency services
    CONTROL_ROOM = "control_room"        # Control room operators (Phase-2)


@dataclass
class RequestContext:
    """
    Request context containing role and scope information.
    
    Attributes:
        role: The user's role (defaults to MEDICAL_STAFF if not provided)
        hospital_id: Optional hospital scope (required for some roles)
    """
    role: UserRole
    hospital_id: Optional[int] = None
    
    @property
    def is_super_admin(self) -> bool:
        return self.role == UserRole.SUPER_ADMIN
    
    @property
    def is_hospital_scoped(self) -> bool:
        """Check if context is scoped to a specific hospital."""
        return self.hospital_id is not None
    
    def can_access_hospital(self, hospital_id: int) -> bool:
        """Check if this context can access a specific hospital."""
        # Super admin, emergency services, and control room can access all
        if self.role in (UserRole.SUPER_ADMIN, UserRole.EMERGENCY_SERVICE, UserRole.CONTROL_ROOM):
            return True
        # Others need matching hospital_id
        return self.hospital_id == hospital_id


async def get_current_context(
    x_role: Optional[str] = Header(None, alias="X-Role"),
    x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID"),
) -> RequestContext:
    """
    Extract role context from request headers.
    
    Headers:
        X-Role: User role (super_admin, hospital_admin, etc.)
        X-Hospital-ID: Hospital scope (required for hospital-specific roles)
    
    Returns:
        RequestContext with role and optional hospital scope
    """
    # Parse role (default to medical_staff for safety)
    role = UserRole.MEDICAL_STAFF
    if x_role:
        try:
            role = UserRole(x_role.lower())
        except ValueError:
            # Invalid role, use default
            pass
    
    # Parse hospital ID
    hospital_id = None
    if x_hospital_id:
        try:
            hospital_id = int(x_hospital_id)
        except ValueError:
            pass
    
    # Validate hospital scope for hospital-bound roles
    if role in (UserRole.HOSPITAL_ADMIN, UserRole.MEDICAL_STAFF) and hospital_id is None:
        # These roles should have a hospital, but we don't enforce yet
        pass
    
    return RequestContext(role=role, hospital_id=hospital_id)


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory that requires specific roles.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN))
        ):
            ...
    
    Args:
        allowed_roles: One or more roles that are permitted
    
    Returns:
        Dependency that validates role and returns context
    """
    async def role_checker(
        context: RequestContext = Depends(get_current_context),
    ) -> RequestContext:
        if context.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{context.role.value}' not authorized. Required: {[r.value for r in allowed_roles]}",
            )
        return context
    
    return role_checker


def require_hospital_access(hospital_id_param: str = "hospital_id") -> Callable:
    """
    Dependency factory that requires access to a specific hospital.
    
    Checks that the user's context allows access to the hospital
    specified in the path parameter.
    
    Usage:
        @router.get("/hospitals/{hospital_id}/beds")
        async def get_beds(
            hospital_id: int,
            ctx: RequestContext = Depends(require_hospital_access())
        ):
            ...
    """
    async def hospital_checker(
        context: RequestContext = Depends(get_current_context),
        **kwargs,
    ) -> RequestContext:
        # Get hospital_id from path params
        hospital_id = kwargs.get(hospital_id_param)
        
        if hospital_id is not None and not context.can_access_hospital(hospital_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to hospital {hospital_id}",
            )
        return context
    
    return hospital_checker


# Role groupings for convenience
ADMIN_ROLES = (UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)
OPERATIONAL_ROLES = (UserRole.HOSPITAL_ADMIN, UserRole.MEDICAL_STAFF)
ALL_ROLES = tuple(UserRole)

# Aliases for Phase-2 API compatibility
Role = UserRole
get_request_context = get_current_context
