import 'dart:async';
import 'package:flutter/material.dart';
import '../services/trip_service.dart';
import '../../../core/services/location_service.dart';

/// Manages the entire trip lifecycle for the driver
class TripProvider extends ChangeNotifier {
  TripData? _activeTrip;
  bool _isPolling = false;
  bool _isSendingLocation = false;
  bool _isOnline = false;
  bool _initialized = false;

  Timer? _pollingTimer;

  /* ---------------- GETTERS ---------------- */

  TripData? get activeTrip => _activeTrip;

  bool get hasActiveTrip => _activeTrip != null;

  String? get tripId => _activeTrip?.id;

  String get tripState => _activeTrip?.state ?? "IDLE";

  bool get isOnline => _isOnline;

  /* ---------------- INITIALIZATION ---------------- */

  /// Initialize provider and auto-start polling
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    // Automatically go online and start polling
    await goOnline();
  }

  /* ---------------- ONLINE/OFFLINE ---------------- */

  Future<void> goOnline() async {
    // Try to update status, but start polling regardless
    // This ensures we catch trips even if status update fails
    await TripService.updateStatus("AVAILABLE");
    _isOnline = true;
    startPolling();
    notifyListeners();
  }

  Future<void> goOffline() async {
    final success = await TripService.updateStatus("OFFLINE");
    if (success) {
      _isOnline = false;
      stopPolling();
      notifyListeners();
    }
  }

  /* ---------------- START POLLING ---------------- */

  void startPolling() {
    if (_isPolling) return;

    _isPolling = true;
    _fetchActiveTrip(); // Fetch immediately

    _pollingTimer = Timer.periodic(
      const Duration(seconds: 2), // Poll every 2 seconds for quick response
      (_) async {
        await _fetchActiveTrip();
      },
    );
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPolling = false;
  }

  /* ---------------- FETCH TRIP ---------------- */

  Future<TripData?> _fetchActiveTrip() async {
    final trip = await TripService.getActiveTrip();

    if (trip != null && _activeTrip?.id != trip.id) {
      _activeTrip = trip;

      // Start sending location once trip exists
      if (!_isSendingLocation) {
        _startLocationUpdates();
      }

      notifyListeners();
    } else if (trip != null) {
      // Update existing trip state
      _activeTrip = trip;
      notifyListeners();
    }

    return trip;
  }

  /// Manually refresh trip data
  Future<void> refreshTrip() async {
    if (tripId == null) return;
    await _fetchActiveTrip();
  }

  /* ---------------- LOCATION UPDATES ---------------- */

  void _startLocationUpdates() {
    _isSendingLocation = true;

    LocationService.startLocationUpdates(
      onLocationUpdate: (lat, lng) async {
        await TripService.updateLocation(lat, lng);
      },
    );
  }

  void _stopLocationUpdates() {
    LocationService.stopLocationUpdates();
    _isSendingLocation = false;
  }

  /* ---------------- DRIVER ACTIONS ---------------- */

  /// Accept trip assignment
  Future<bool> acceptTrip() async {
    final currentTripId = tripId;

    // If we have an active trip but no ID, use a placeholder success
    // This handles demo/hackathon mode where backend may not return proper ID
    if (currentTripId == null) {
      if (_activeTrip != null) {
        // We have a trip object but no ID - proceed anyway for demo
        print("[TripProvider] No trip ID but have active trip - proceeding");
        _activeTrip = _activeTrip!.copyWith(state: 'ACCEPTED');
        notifyListeners();
        return true;
      }
      return false;
    }

    final trip = await TripService.acceptTrip(currentTripId);
    if (trip != null) {
      _activeTrip = trip;
      notifyListeners();
      return true;
    }

    // If API call fails, still proceed for demo purposes
    if (_activeTrip != null) {
      print("[TripProvider] Accept API failed - proceeding anyway for demo");
      _activeTrip = _activeTrip!.copyWith(state: 'ACCEPTED');
      notifyListeners();
      return true;
    }

    return false;
  }

  /// Arrive at accident scene
  Future<bool> arriveAtScene() async {
    final currentTripId = tripId;

    if (currentTripId == null) {
      if (_activeTrip != null) {
        _activeTrip = _activeTrip!.copyWith(state: 'AT_SCENE');
        notifyListeners();
        return true;
      }
      return false;
    }

    final trip = await TripService.arriveAtScene(currentTripId);
    if (trip != null) {
      _activeTrip = trip;
      notifyListeners();
      return true;
    }

    // Fallback for demo
    if (_activeTrip != null) {
      _activeTrip = _activeTrip!.copyWith(state: 'AT_SCENE');
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Confirm patient pickup
  Future<bool> confirmPickup() async {
    final currentTripId = tripId;

    if (currentTripId == null) {
      if (_activeTrip != null) {
        _activeTrip = _activeTrip!.copyWith(state: 'PATIENT_ONBOARD');
        notifyListeners();
        return true;
      }
      return false;
    }

    final trip = await TripService.patientOnboard(currentTripId);
    if (trip != null) {
      _activeTrip = trip;
      notifyListeners();
      return true;
    }

    // Fallback for demo
    if (_activeTrip != null) {
      _activeTrip = _activeTrip!.copyWith(state: 'PATIENT_ONBOARD');
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Arrive at hospital
  Future<bool> arriveAtHospital() async {
    final currentTripId = tripId;

    if (currentTripId == null) {
      if (_activeTrip != null) {
        _activeTrip = _activeTrip!.copyWith(state: 'AT_HOSPITAL');
        notifyListeners();
        return true;
      }
      return false;
    }

    final trip = await TripService.arriveAtHospital(currentTripId);
    if (trip != null) {
      _activeTrip = trip;
      notifyListeners();
      return true;
    }

    // Fallback for demo
    if (_activeTrip != null) {
      _activeTrip = _activeTrip!.copyWith(state: 'AT_HOSPITAL');
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Complete trip
  Future<bool> completeTrip() async {
    final currentTripId = tripId;

    if (currentTripId == null) {
      _clearTrip();
      return true;
    }

    await TripService.completeTrip(currentTripId);

    // Always clear for demo
    _clearTrip();
    return true;
  }

  /* ---------------- RESET ---------------- */

  void _clearTrip() {
    _activeTrip = null;
    _stopLocationUpdates();
    notifyListeners();
  }

  /* ---------------- STOP EVERYTHING ---------------- */

  void stopAll() {
    stopPolling();
    _stopLocationUpdates();
    _isOnline = false;
    _activeTrip = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stopAll();
    super.dispose();
  }
}
