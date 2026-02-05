import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

/// Configuration for smooth ambulance marker behavior
class SmoothAmbulanceConfig {
  /// Minimum distance (meters) to accept - ignore GPS jitter
  final double distanceFilterMeters;

  /// Number of interpolation frames between positions (30-60 for smooth motion)
  final int interpolationFrames;

  /// Duration for each interpolation segment
  final Duration interpolationDuration;

  /// Smoothing factor 0-1 (higher = less smoothing, more responsive)
  final double smoothingFactor;

  const SmoothAmbulanceConfig({
    this.distanceFilterMeters = 8.0,
    this.interpolationFrames = 45,
    this.interpolationDuration = const Duration(milliseconds: 500),
    this.smoothingFactor = 0.3,
  });
}

/// Controller for smooth ambulance marker animation.
/// Handles: interpolation, bearing, GPS smoothing, distance filter.
class SmoothAmbulanceController extends ChangeNotifier {
  SmoothAmbulanceController({
    LatLng? initialPosition,
    this.config = const SmoothAmbulanceConfig(),
  }) : _displayPosition = initialPosition ?? const LatLng(13.0827, 80.2707) {
    _smoothedLat = _displayPosition!.latitude;
    _smoothedLng = _displayPosition!.longitude;
  }

  final SmoothAmbulanceConfig config;

  LatLng? _displayPosition;
  double _bearingDegrees = 0;
  double _smoothedLat = 0;
  double _smoothedLng = 0;
  LatLng? _lastAcceptedPosition;
  Timer? _animTimer;
  DateTime? _animStartTime;
  bool _isAnimating = false;
  LatLng? _animFrom;
  LatLng? _animTo;

  LatLng? get displayPosition => _displayPosition;
  double get bearingDegrees => _bearingDegrees;
  bool get isAnimating => _isAnimating;

  static const double _earthRadiusM = 6371000;

  /// Update with new GPS position. Applies distance filter and smoothing.
  void updatePosition(LatLng newPos) {
    if (_displayPosition == null) {
      _displayPosition = newPos;
      _smoothedLat = newPos.latitude;
      _smoothedLng = newPos.longitude;
      _lastAcceptedPosition = newPos;
      notifyListeners();
      return;
    }

    // Distance filter: ignore tiny movements (GPS noise)
    if (_lastAcceptedPosition != null) {
      final distM = _haversineMeters(
        _lastAcceptedPosition!.latitude,
        _lastAcceptedPosition!.longitude,
        newPos.latitude,
        newPos.longitude,
      );
      if (distM < config.distanceFilterMeters) return;
    }

    // Exponential moving average smoothing
    _smoothedLat += config.smoothingFactor * (newPos.latitude - _smoothedLat);
    _smoothedLng += config.smoothingFactor * (newPos.longitude - _smoothedLng);
    final smoothed = LatLng(_smoothedLat, _smoothedLng);
    _lastAcceptedPosition = smoothed;

    // Calculate bearing for icon rotation
    _bearingDegrees = _calculateBearing(
      _displayPosition!.latitude,
      _displayPosition!.longitude,
      smoothed.latitude,
      smoothed.longitude,
    );

    _startInterpolation(_displayPosition!, smoothed);
  }

  /// Set position immediately (no interpolation) - e.g. on init or reset
  void setPositionImmediate(LatLng pos) {
    _stopAnimation();
    _displayPosition = pos;
    _smoothedLat = pos.latitude;
    _smoothedLng = pos.longitude;
    _lastAcceptedPosition = pos;
    notifyListeners();
  }

  void _startInterpolation(LatLng from, LatLng to) {
    _animFrom = from;
    _animTo = to;
    _animStartTime = DateTime.now();
    _isAnimating = true;

    _animTimer?.cancel();
    _animTimer = Timer.periodic(
      const Duration(milliseconds: 16),
      _onAnimTick,
    );
  }

  void _onAnimTick(Timer timer) {
    if (_animFrom == null || _animTo == null || _animStartTime == null) return;

    final elapsed =
        DateTime.now().difference(_animStartTime!).inMilliseconds;
    final totalMs = config.interpolationDuration.inMilliseconds;
    final t = (elapsed / totalMs).clamp(0.0, 1.0);
    final eased = _easeInOutCubic(t);

    _displayPosition = LatLng(
      _animFrom!.latitude + (_animTo!.latitude - _animFrom!.latitude) * eased,
      _animFrom!.longitude +
          (_animTo!.longitude - _animFrom!.longitude) * eased,
    );

    if (t >= 1.0) {
      _stopAnimation();
      _displayPosition = _animTo;
    }

    notifyListeners();
  }

  void _stopAnimation() {
    _animTimer?.cancel();
    _animTimer = null;
    _isAnimating = false;
  }

  static double _easeInOutCubic(double t) {
    return t < 0.5 ? 4 * t * t * t : 1 - math.pow(-2 * t + 2, 3) / 2;
  }

  static double _haversineMeters(
      double lat1, double lng1, double lat2, double lng2) {
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRad(lat1)) *
            math.cos(_toRad(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return _earthRadiusM * c;
  }

  static double _toRad(double deg) => deg * math.pi / 180;

  /// Bearing in degrees (0 = North, 90 = East)
  static double _calculateBearing(
      double lat1, double lng1, double lat2, double lng2) {
    final dLng = _toRad(lng2 - lng1);
    final y = math.sin(dLng) * math.cos(_toRad(lat2));
    final x = math.cos(_toRad(lat1)) * math.sin(_toRad(lat2)) -
        math.sin(_toRad(lat1)) * math.cos(_toRad(lat2)) * math.cos(dLng);
    var bearing = math.atan2(y, x) * 180 / math.pi;
    return (bearing + 360) % 360;
  }

  @override
  void dispose() {
    _stopAnimation();
    super.dispose();
  }
}
