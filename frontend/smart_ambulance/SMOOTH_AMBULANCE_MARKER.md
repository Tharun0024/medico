# Smooth Ambulance Marker Implementation

This document describes the smooth marker animation system for the ambulance driver app, designed to provide fluid, Google Maps-style movement without jitter or buffering.

## Overview

The ambulance marker now uses:
- **Smooth interpolation** between old and new positions (Tween with ease-in-out)
- **High-frequency updates** (~8 Hz) with interpolation in small steps (~60 fps)
- **ValueNotifier/ListenableBuilder** to avoid full `setState()` rebuilds
- **Camera throttling** – moves only every 2 seconds
- **GPS noise handling** – distance filter and EMA smoothing
- **Bearing-based rotation** – ambulance icon rotates with direction of travel

## Architecture

### Files

| File | Purpose |
|------|---------|
| `lib/shared/widgets/smooth_ambulance_marker.dart` | `SmoothAmbulanceController` – interpolation, bearing, smoothing |
| `lib/shared/widgets/osm_navigation_map.dart` | Map widget with smooth marker and camera throttling |
| `lib/features/driver/screens/navigation_accident_screen.dart` | Accident navigation with smooth updates |
| `lib/features/driver/screens/navigation_hospital_screen.dart` | Hospital navigation with smooth updates |

### SmoothAmbulanceController

- **`updatePosition(LatLng)`** – Feeds new GPS/simulated position
- **`displayPosition`** – Current interpolated position (for marker)
- **`bearingDegrees`** – Rotation angle for icon (0 = North, 90 = East)
- **Distance filter** – Ignores movements < 2m (configurable)
- **EMA smoothing** – Reduces GPS jitter
- **Interpolation** – Animates from current to target over 200ms at 60 fps

### Configuration

```dart
SmoothAmbulanceConfig(
  distanceFilterMeters: 2.0,      // Ignore tiny movements
  interpolationFrames: 45,
  interpolationDuration: Duration(milliseconds: 200),
  smoothingFactor: 0.5,
)
```

## Usage

### With internal controller (default)

Pass `ambulanceLat` and `ambulanceLng`; the map creates and manages the controller:

```dart
OSMNavigationMap(
  ambulanceLat: _ambulanceLat,
  ambulanceLng: _ambulanceLng,
  patientLat: _patientLat,
  patientLng: _patientLng,
  // ...
)
```

### With custom controller

For live GPS or custom logic:

```dart
final controller = SmoothAmbulanceController(
  initialPosition: LatLng(lat, lng),
  config: SmoothAmbulanceConfig(...),
);

// Feed positions from GPS stream
controller.updatePosition(LatLng(newLat, newLng));

OSMNavigationMap(
  ambulanceController: controller,
  // ...
)
```

## Update frequency

- **Position updates**: ~8 Hz (every 120ms) from navigation screens
- **Interpolation**: 16ms (≈60 fps) for smooth animation
- **Camera**: Every 2 seconds (throttled)

## Bearing calculation

Bearing is computed with the haversine formula between consecutive positions. The ambulance icon rotates via `Transform.rotate` to match travel direction.
