import 'dart:async';

/// Location service for ambulance tracking
/// ⚠️ Hackathon default: USE MOCK LOCATION
class LocationService {
  static StreamSubscription<Map<String, double>>? _subscription;

  /* ----------------------------------------------------
   * MOCK LOCATION (RECOMMENDED FOR HACKATHON)
   * -------------------------------------------------- */

  /// Simulated GPS movement (smooth & reliable)
  static Stream<Map<String, double>> mockLocationStream({
    double startLat = 13.0524,
    double startLng = 80.2508,
  }) async* {
    double lat = startLat;
    double lng = startLng;

    while (true) {
      await Future.delayed(const Duration(seconds: 3));

      // Small movement simulation
      lat += 0.00008;
      lng += 0.00006;

      yield {
        "lat": lat,
        "lng": lng,
      };
    }
  }

  /* ----------------------------------------------------
   * START SENDING LOCATION TO BACKEND
   * -------------------------------------------------- */

  static void startLocationUpdates({
    required Function(double lat, double lng) onLocationUpdate,
  }) {
    _subscription = mockLocationStream().listen((location) {
      onLocationUpdate(location["lat"]!, location["lng"]!);
    });
  }

  /* ----------------------------------------------------
   * STOP LOCATION UPDATES
   * -------------------------------------------------- */

  static void stopLocationUpdates() {
    _subscription?.cancel();
    _subscription = null;
  }
}
