import '../data/mock_trip_data.dart';
import '../models/trip.dart';
import 'static_auth_service.dart';

/// Static trip service for Phase 1
/// Returns mock trip data scoped to logged-in ambulance
/// No backend API calls - purely offline data
class StaticTripService {
  StaticTripService._();

  // In-memory trip state (for simulation)
  static Trip? _currentTrip;
  static bool _isOnline = false;

  /// Get online status (for traffic simulation toggle)
  static bool get isOnline => _isOnline;

  /// Toggle online status
  static void setOnline(bool online) {
    _isOnline = online;
  }

  /// Get current trip for logged-in ambulance
  static Trip? getCurrentTrip() {
    final ambulanceId = StaticAuthService.ambulanceId;
    if (ambulanceId == null) return null;

    // If we have a cached trip for this ambulance, return it
    if (_currentTrip != null && _currentTrip!.ambulanceId == ambulanceId) {
      return _currentTrip;
    }

    // Otherwise, get from mock data
    _currentTrip = MockTripData.getTripForAmbulance(ambulanceId);
    return _currentTrip;
  }

  /// Check if there's an active trip for current ambulance
  static bool hasActiveTrip() {
    final trip = getCurrentTrip();
    if (trip == null) return false;
    return trip.status != TripStatus.completed && 
           trip.status != TripStatus.cancelled;
  }

  /// Simulate route change (traffic-based re-routing)
  /// Updates ETA and route status
  static Trip? simulateRouteChange() {
    if (_currentTrip == null) return null;
    
    _currentTrip = MockTripData.simulateRouteChange(_currentTrip!);
    return _currentTrip;
  }

  /// Update trip status
  static Trip? updateTripStatus(TripStatus newStatus) {
    if (_currentTrip == null) return null;

    _currentTrip = _currentTrip!.copyWith(status: newStatus);
    return _currentTrip;
  }

  /// Clear ETA and traffic alert (when route is back to normal)
  static Trip? clearTrafficAlert() {
    if (_currentTrip == null) return null;

    _currentTrip = _currentTrip!.copyWith(
      routeStatus: 'NORMAL',
      trafficAlert: null,
    );
    return _currentTrip;
  }

  /// Simulate ETA update
  static Trip? updateEta(String newEta) {
    if (_currentTrip == null) return null;

    _currentTrip = _currentTrip!.copyWith(eta: newEta);
    return _currentTrip;
  }

  /// Reset trip (for testing)
  static void resetTrip() {
    _currentTrip = null;
  }

  /// Get all active trips (for dashboard overview)
  static List<Trip> getAllActiveTrips() {
    return MockTripData.getActiveTrips();
  }

  /// Get online status text for UI
  static String get onlineStatusText {
    return _isOnline 
        ? 'Live traffic simulation enabled'
        : 'Fallback traffic logic active';
  }
}
