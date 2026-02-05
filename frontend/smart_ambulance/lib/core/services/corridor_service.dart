import 'dart:convert';
import 'api_service.dart';

/// Signal state data
class SignalData {
  final String state;
  final String reason;
  final double distanceKm;
  final String severity;

  SignalData({
    required this.state,
    required this.reason,
    required this.distanceKm,
    required this.severity,
  });

  factory SignalData.fromJson(Map<String, dynamic> json) {
    return SignalData(
      state: json['state'] ?? 'RED',
      reason: json['reason'] ?? '',
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0,
      severity: json['severity'] ?? 'HIGH',
    );
  }

  bool get isGreen => state == 'GREEN';
}

/// Corridor signal state
class CorridorSignal {
  final String signalId;
  final String state;
  final String reason;
  final double distanceKm;

  CorridorSignal({
    required this.signalId,
    required this.state,
    required this.reason,
    required this.distanceKm,
  });

  factory CorridorSignal.fromJson(Map<String, dynamic> json) {
    return CorridorSignal(
      signalId: json['signal_id'] ?? '',
      state: json['state'] ?? 'RED',
      reason: json['reason'] ?? '',
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Corridor update response
class CorridorData {
  final String ambulanceId;
  final String? hospitalId;
  final String severity;
  final List<String> corridorSignals;
  final String type;

  CorridorData({
    required this.ambulanceId,
    this.hospitalId,
    required this.severity,
    required this.corridorSignals,
    required this.type,
  });

  factory CorridorData.fromJson(Map<String, dynamic> json) {
    return CorridorData(
      ambulanceId: json['ambulance_id'] ?? '',
      hospitalId: json['hospital_id'],
      severity: json['severity'] ?? 'HIGH',
      corridorSignals: List<String>.from(json['corridor_signals'] ?? []),
      type: json['type'] ?? 'radius_fallback',
    );
  }
}

/// Corridor status with signal states
class CorridorStatus {
  final String ambulanceId;
  final String? hospitalId;
  final List<String> fullRoute;
  final List<String> activeCorridor;
  final List<CorridorSignal> states;

  CorridorStatus({
    required this.ambulanceId,
    this.hospitalId,
    required this.fullRoute,
    required this.activeCorridor,
    required this.states,
  });

  factory CorridorStatus.fromJson(Map<String, dynamic> json) {
    return CorridorStatus(
      ambulanceId: json['ambulance_id'] ?? '',
      hospitalId: json['hospital_id'],
      fullRoute: List<String>.from(json['full_route'] ?? []),
      activeCorridor: List<String>.from(json['active_corridor'] ?? []),
      states: (json['states'] as List?)
              ?.map((s) => CorridorSignal.fromJson(s))
              .toList() ??
          [],
    );
  }

  int get greenSignals => states.where((s) => s.state == 'GREEN').length;
}

/// Service for signal and corridor management
class CorridorService {
  /// Request signal priority for ambulance
  static Future<SignalData?> requestSignalPriority({
    required String ambulanceId,
    String severity = 'HIGH',
  }) async {
    try {
      final response = await ApiService.post(
        "/signals/$ambulanceId",
        {"severity": severity},
      );

      if (ApiService.isSuccess(response)) {
        return SignalData.fromJson(jsonDecode(response.body));
      }

      print("[CorridorService] Signal request failed: ${response.body}");
      return null;
    } catch (e) {
      print("[CorridorService] Error requesting signal: $e");
      return null;
    }
  }

  /// Update corridor for emergency route
  static Future<CorridorData?> updateCorridor({
    String severity = 'HIGH',
  }) async {
    try {
      final response = await ApiService.post(
        "/corridor/update",
        {"severity": severity},
      );

      if (ApiService.isSuccess(response)) {
        return CorridorData.fromJson(jsonDecode(response.body));
      }

      print("[CorridorService] Corridor update failed: ${response.body}");
      return null;
    } catch (e) {
      print("[CorridorService] Error updating corridor: $e");
      return null;
    }
  }

  /// Get corridor status for ambulance
  static Future<CorridorStatus?> getCorridorStatus(String ambulanceId) async {
    try {
      final response = await ApiService.get("/corridor/$ambulanceId");

      if (ApiService.isSuccess(response)) {
        return CorridorStatus.fromJson(jsonDecode(response.body));
      }

      return null;
    } catch (e) {
      print("[CorridorService] Error getting corridor status: $e");
      return null;
    }
  }

  /// Get signal state
  static Future<Map<String, dynamic>?> getSignalState(String signalId) async {
    try {
      final response = await ApiService.get("/signals/$signalId/state");

      if (ApiService.isSuccess(response)) {
        return jsonDecode(response.body);
      }

      return null;
    } catch (e) {
      print("[CorridorService] Error getting signal state: $e");
      return null;
    }
  }
}
