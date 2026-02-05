"""
AMB Integrations Layer

This package contains clients for external system communication.
AMB uses these clients to interact with MEDICO without tight coupling.

- medico_client: HTTP client for MEDICO API calls
"""

from amb.integrations.medico_client import MedicoClient, get_medico_client

__all__ = ["MedicoClient", "get_medico_client"]
