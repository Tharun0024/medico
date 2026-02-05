# backend/app/services/traffic_llm.py

import os
import httpx
from typing import Any, Dict
from datetime import datetime, timezone


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free"


class TrafficSnapshot:
    def __init__(
        self,
        congestion_level: str,
        incident: str | None,
        estimated_clearance_minutes: int,
        confidence: float,
        generated_at: datetime,
    ) -> None:
        self.congestion_level = congestion_level
        self.incident = incident
        self.estimated_clearance_minutes = estimated_clearance_minutes
        self.confidence = confidence
        self.generated_at = generated_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            "congestion_level": self.congestion_level,
            "incident": self.incident,
            "estimated_clearance_minutes": self.estimated_clearance_minutes,
            "confidence": self.confidence,
            "generated_at": self.generated_at.isoformat(),
        }


async def fetch_traffic_snapshot(
    lat: float,
    lng: float,
    speed_kmh: float,
) -> TrafficSnapshot:
    """
    Call OpenRouter to simulate traffic conditions at the given location.
    Returns a structured TrafficSnapshot object.
    """
    now = datetime.now(timezone.utc)

    # Skip early fallback - try API first
    time_of_day = now.isoformat()

    schema = {
        "type": "object",
        "properties": {
            "congestion_level": {
                "type": "string",
                "enum": ["low", "medium", "high"],
            },
            "incident": {
                "type": ["string", "null"],
            },
            "estimated_clearance_minutes": {
                "type": "integer",
                "minimum": 0,
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
            },
        },
        "required": [
            "congestion_level",
            "incident",
            "estimated_clearance_minutes",
            "confidence",
        ],
        "additionalProperties": False,
    }

    payload: Dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a traffic simulation engine. "
                    "You must only return JSON describing current traffic, "
                    "not routing or control decisions."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Location: lat={lat}, lng={lng}. "
                    f"Speed: {speed_kmh:.1f} km/h. "
                    f"Time (ISO 8601): {time_of_day}. "
                    "Simulate current traffic conditions around this point. "
                    "Respond ONLY with valid JSON in this exact format: "
                    '{"congestion_level": "low|medium|high", "incident": "description or null", '
                    '"estimated_clearance_minutes": number, "confidence": 0.0-1.0}'
                ),
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(OPENROUTER_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        # Parse the content - it might be a JSON string or already parsed
        content_raw = data["choices"][0]["message"]["content"]
        if isinstance(content_raw, str):
            import json
            # Strip leading/trailing whitespace from LLM response
            content = json.loads(content_raw.strip())
        else:
            content = content_raw

        congestion_level = content["congestion_level"]
        incident = content.get("incident")
        estimated_clearance_minutes = content["estimated_clearance_minutes"]
        confidence = content["confidence"]

        return TrafficSnapshot(
            congestion_level=congestion_level,
            incident=incident,
            estimated_clearance_minutes=estimated_clearance_minutes,
            confidence=confidence,
            generated_at=now,
        )
    except Exception as e:
        # On API failure (no credits, network error, etc), use fallback
        print(f"OpenRouter API failed: {e}. Using fallback traffic simulation.")
        import random
        hour = now.hour
        
        if 7 <= hour < 10 or 17 <= hour < 20:
            congestion = random.choice(["high", "high", "medium"])
            clearance = random.randint(15, 30)
        elif 10 <= hour < 17:
            congestion = random.choice(["medium", "medium", "low"])
            clearance = random.randint(5, 15)
        else:
            congestion = random.choice(["low", "low", "medium"])
            clearance = random.randint(2, 8)
        
        incidents = [None, None, None, "Minor accident", "Road work", "Heavy traffic"]
        incident = random.choice(incidents)
        
        return TrafficSnapshot(
            congestion_level=congestion,
            incident=incident,
            estimated_clearance_minutes=clearance if incident else random.randint(2, 10),
            confidence=round(random.uniform(0.7, 0.9), 2),
            generated_at=now,
        )
