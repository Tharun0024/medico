import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_colors.dart';
import 'smooth_ambulance_marker.dart';

/// OpenStreetMap-based navigation map with smooth ambulance marker animation.
class OSMNavigationMap extends StatefulWidget {
  final double? ambulanceLat;
  final double? ambulanceLng;
  final double? patientLat;
  final double? patientLng;
  final double? hospitalLat;
  final double? hospitalLng;
  final String? destinationName;
  final bool showRoute;
  final bool isGreenCorridor;
  final List<String> prioritySignalIds;
  final String tripState;
  final List<Map<String, dynamic>>? corridorSignals;
  final VoidCallback? onRecenter;

  /// Optional: provide for smooth marker animation. If null, creates internal one from ambulanceLat/Lng.
  final SmoothAmbulanceController? ambulanceController;

  const OSMNavigationMap({
    super.key,
    this.ambulanceLat,
    this.ambulanceLng,
    this.patientLat,
    this.patientLng,
    this.hospitalLat,
    this.hospitalLng,
    this.destinationName,
    this.showRoute = false,
    this.isGreenCorridor = false,
    this.prioritySignalIds = const [],
    this.tripState = 'IDLE',
    this.corridorSignals,
    this.onRecenter,
    this.ambulanceController,
  });

  @override
  State<OSMNavigationMap> createState() => _OSMNavigationMapState();
}

class _OSMNavigationMapState extends State<OSMNavigationMap> {
  late MapController _mapController;
  bool _isMapReady = false;
  SmoothAmbulanceController? _internalController;
  DateTime? _lastCameraMove;
  static const _cameraThrottleSeconds = 2;

  static const LatLng _chennaiCenter = LatLng(13.0827, 80.2707);

  SmoothAmbulanceController get _controller =>
      widget.ambulanceController ?? _internalController!;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    if (widget.ambulanceController == null &&
        (widget.ambulanceLat != null && widget.ambulanceLng != null)) {
      _internalController = SmoothAmbulanceController(
        initialPosition: LatLng(widget.ambulanceLat!, widget.ambulanceLng!),
        config: const SmoothAmbulanceConfig(
          distanceFilterMeters: 2.0,
          interpolationFrames: 45,
          interpolationDuration: Duration(milliseconds: 200),
          smoothingFactor: 0.5,
        ),
      );
    }
  }

  @override
  void didUpdateWidget(OSMNavigationMap oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Feed position to internal controller when using lat/lng props
    if (widget.ambulanceController == null &&
        _internalController != null &&
        widget.ambulanceLat != null &&
        widget.ambulanceLng != null) {
      final newPos = LatLng(widget.ambulanceLat!, widget.ambulanceLng!);
      _internalController!.updatePosition(newPos);
    }

    // Camera: throttle to every N seconds, or when first load
    if (!_isMapReady) return;

    final now = DateTime.now();
    final shouldMove = _lastCameraMove == null ||
        now.difference(_lastCameraMove!).inSeconds >= _cameraThrottleSeconds;

    if (shouldMove) {
      final pos = _getAmbulancePositionForCamera();
      if (pos != null) {
        _mapController.move(pos, _mapController.camera.zoom);
        _lastCameraMove = now;
      }
    }
  }

  LatLng? _getAmbulancePositionForCamera() {
    if (widget.ambulanceController != null) {
      return _controller.displayPosition;
    }
    if (widget.ambulanceLat != null && widget.ambulanceLng != null) {
      return LatLng(widget.ambulanceLat!, widget.ambulanceLng!);
    }
    return null;
  }

  @override
  void dispose() {
    _internalController?.dispose();
    super.dispose();
  }

  LatLng get _initialCenter {
    if (widget.ambulanceLat != null && widget.ambulanceLng != null) {
      return LatLng(widget.ambulanceLat!, widget.ambulanceLng!);
    }
    return _chennaiCenter;
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _initialCenter,
        initialZoom: 15.0,
        minZoom: 12.0,
        maxZoom: 18.0,
        onMapReady: () {
          setState(() => _isMapReady = true);
        },
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.smartambulance.app',
          maxZoom: 18,
        ),
        if (widget.showRoute) _buildRouteLayer(),
        if (widget.isGreenCorridor) _buildCorridorLayer(),
        _buildMarkersLayer(),
      ],
    );
  }

  PolylineLayer _buildRouteLayer() {
    final routePoints = <LatLng>[];
    final ambPos = _getAmbulanceDisplayPosition();

    if (ambPos != null) routePoints.add(ambPos);

    if (widget.patientLat != null &&
        widget.patientLng != null &&
        (widget.tripState == 'EN_ROUTE_TO_PATIENT' ||
            widget.tripState == 'HEADING_TO_ACCIDENT' ||
            widget.tripState == 'EN_ROUTE_TO_SCENE')) {
      routePoints.add(LatLng(widget.patientLat!, widget.patientLng!));
    }

    if (widget.hospitalLat != null && widget.hospitalLng != null) {
      if (widget.tripState == 'PATIENT_ONBOARD' ||
          widget.tripState == 'HEADING_TO_HOSPITAL' ||
          widget.tripState == 'EN_ROUTE_TO_HOSPITAL') {
        routePoints.add(LatLng(widget.hospitalLat!, widget.hospitalLng!));
      }
    }

    return PolylineLayer(
      polylines: [
        Polyline(
          points: routePoints,
          strokeWidth: 5.0,
          color: widget.isGreenCorridor ? AppColors.available : AppColors.accent,
          borderColor: Colors.white,
          borderStrokeWidth: 2.0,
        ),
      ],
    );
  }

  PolylineLayer _buildCorridorLayer() {
    final corridorPoints = <LatLng>[];
    final ambPos = _getAmbulanceDisplayPosition();
    if (ambPos != null) corridorPoints.add(ambPos);

    if (widget.tripState == 'EN_ROUTE_TO_PATIENT' ||
        widget.tripState == 'HEADING_TO_ACCIDENT' ||
        widget.tripState == 'EN_ROUTE_TO_SCENE') {
      if (widget.patientLat != null && widget.patientLng != null) {
        corridorPoints.add(LatLng(widget.patientLat!, widget.patientLng!));
      }
    } else if (widget.hospitalLat != null && widget.hospitalLng != null) {
      corridorPoints.add(LatLng(widget.hospitalLat!, widget.hospitalLng!));
    }

    return PolylineLayer(
      polylines: [
        Polyline(
          points: corridorPoints,
          strokeWidth: 12.0,
          color: AppColors.available.withOpacity(0.3),
        ),
      ],
    );
  }

  LatLng? _getAmbulanceDisplayPosition() {
    if (_internalController != null || widget.ambulanceController != null) {
      return _controller.displayPosition;
    }
    if (widget.ambulanceLat != null && widget.ambulanceLng != null) {
      return LatLng(widget.ambulanceLat!, widget.ambulanceLng!);
    }
    return null;
  }

  Widget _buildMarkersLayer() {
    if (_internalController != null || widget.ambulanceController != null) {
      return ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          return MarkerLayer(
            markers: _buildMarkers(),
          );
        },
      );
    }
    return MarkerLayer(
      markers: _buildMarkers(),
    );
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];
    final ambPos = _getAmbulanceDisplayPosition();
    double bearing = 0;
    if (_internalController != null || widget.ambulanceController != null) {
      bearing = _controller.bearingDegrees;
    }

    if (ambPos != null) {
      markers.add(_buildAmbulanceMarker(ambPos, bearing));
    }

    if (widget.patientLat != null && widget.patientLng != null) {
      final isPickedUp = widget.tripState == 'PATIENT_ONBOARD' ||
          widget.tripState == 'HEADING_TO_HOSPITAL' ||
          widget.tripState == 'EN_ROUTE_TO_HOSPITAL' ||
          widget.tripState == 'AT_HOSPITAL';

      markers.add(
        Marker(
          point: LatLng(widget.patientLat!, widget.patientLng!),
          width: 45,
          height: 45,
          child: Container(
            decoration: BoxDecoration(
              color: isPickedUp ? Colors.grey : Colors.red,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: isPickedUp
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.red.withOpacity(0.5),
                        blurRadius: 10,
                        spreadRadius: 1,
                      ),
                    ],
            ),
            child: Icon(
              isPickedUp ? Icons.check : Icons.person,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      );
    }

    if (widget.hospitalLat != null && widget.hospitalLng != null) {
      markers.add(
        Marker(
          point: LatLng(widget.hospitalLat!, widget.hospitalLng!),
          width: 45,
          height: 45,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: const Icon(
              Icons.local_hospital,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      );
    }

    if (widget.corridorSignals != null) {
      for (final signal in widget.corridorSignals!) {
        final lat = signal['lat'] as double?;
        final lng = signal['lng'] as double?;
        final state = signal['state'] as String? ?? 'NORMAL';
        final signalId = signal['signal_id'] as String? ?? '';
        final isPriority = widget.prioritySignalIds.contains(signalId) ||
            state == 'GREEN_FOR_AMBULANCE' ||
            state == 'GREEN';

        if (lat != null && lng != null) {
          markers.add(
            Marker(
              point: LatLng(lat, lng),
              width: 30,
              height: 30,
              child: Container(
                decoration: BoxDecoration(
                  color: isPriority ? AppColors.available : Colors.red,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(
                  Icons.traffic,
                  color: Colors.white,
                  size: 16,
                ),
              ),
            ),
          );
        }
      }
    }

    return markers;
  }

  Marker _buildAmbulanceMarker(LatLng point, double bearingDegrees) {
    return Marker(
      point: point,
      width: 56,
      height: 56,
      child: Transform.rotate(
        angle: bearingDegrees * 3.14159 / 180,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.accent,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: AppColors.accent.withOpacity(0.5),
                blurRadius: 12,
                spreadRadius: 2,
              ),
            ],
          ),
          child: const Icon(
            Icons.local_shipping,
            color: Colors.white,
            size: 28,
          ),
        ),
      ),
    );
  }
}
