import 'dart:convert';
import 'api_service.dart';

/// GPS data model from backend
class GPSData {
  final double lat;
  final double lng;
  final double speedKmh;
  final String updatedAt;
  final String routeName;
  final int routeIndex;
  final bool isRunning;

  GPSData({
    required this.lat,
    required this.lng,
    required this.speedKmh,
    required this.updatedAt,
    required this.routeName,
    required this.routeIndex,
    required this.isRunning,
  });

  factory GPSData.fromJson(Map<String, dynamic> json) {
    return GPSData(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      speedKmh: (json['speed_kmh'] as num?)?.toDouble() ?? 0,
      updatedAt: json['updated_at'] ?? '',
      routeName: json['route_name'] ?? '',
      routeIndex: json['route_index'] ?? 0,
      isRunning: json['is_running'] ?? false,
    );
  }
}

/// Service for GPS simulation endpoints
class GPSService {
  /// Start GPS simulation for current ambulance
  static Future<bool> startSimulation({
    String? routeName,
    double stepSeconds = 3.0,
    double speedKmh = 40.0,
  }) async {
    try {
      final response = await ApiService.post(
        "/gps/start",
        {
          "route_name": routeName ?? "default_city_loop",
          "step_seconds": stepSeconds,
          "speed_kmh": speedKmh,
        },
      );

      if (ApiService.isSuccess(response)) {
        print("[GPSService] Simulation started");
        return true;
      }

      print("[GPSService] Failed to start simulation: ${response.body}");
      return false;
    } catch (e) {
      print("[GPSService] Error starting simulation: $e");
      return false;
    }
  }

  /// Get current GPS position
  static Future<GPSData?> getCurrentPosition() async {
    try {
      final response = await ApiService.get("/gps/current");

      if (ApiService.isSuccess(response)) {
        return GPSData.fromJson(jsonDecode(response.body));
      }

      return null;
    } catch (e) {
      print("[GPSService] Error fetching GPS: $e");
      return null;
    }
  }
}
