import 'dart:convert';
import 'api_service.dart';

/// System status data
class SystemStatus {
  final List<String> activeAmbulances;
  final Map<String, dynamic> lockedResources;
  final List<String> suppressedAmbulances;
  final List<Map<String, dynamic>> logPreview;

  SystemStatus({
    required this.activeAmbulances,
    required this.lockedResources,
    required this.suppressedAmbulances,
    required this.logPreview,
  });

  factory SystemStatus.fromJson(Map<String, dynamic> json) {
    return SystemStatus(
      activeAmbulances: List<String>.from(json['active_ambulances'] ?? []),
      lockedResources: Map<String, dynamic>.from(json['locked_resources'] ?? {}),
      suppressedAmbulances: List<String>.from(json['suppressed_ambulances'] ?? []),
      logPreview: List<Map<String, dynamic>>.from(json['log_preview'] ?? []),
    );
  }
}

/// Service for system status and logs
class SystemService {
  /// Get overall system status
  static Future<SystemStatus?> getStatus() async {
    try {
      final response = await ApiService.get("/system/status");

      if (ApiService.isSuccess(response)) {
        return SystemStatus.fromJson(jsonDecode(response.body));
      }

      return null;
    } catch (e) {
      print("[SystemService] Error getting status: $e");
      return null;
    }
  }

  /// Get logs for specific ambulance
  static Future<List<Map<String, dynamic>>> getAmbulanceLogs(String ambulanceId) async {
    try {
      final response = await ApiService.get("/system/logs/$ambulanceId");

      if (ApiService.isSuccess(response)) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['logs'] ?? []);
      }

      return [];
    } catch (e) {
      print("[SystemService] Error getting logs: $e");
      return [];
    }
  }

  /// Get conflict history for a signal
  static Future<List<Map<String, dynamic>>> getSignalConflicts(String signalId) async {
    try {
      final response = await ApiService.get("/system/conflicts/$signalId");

      if (ApiService.isSuccess(response)) {
        final data = jsonDecode(response.body);
        return List<Map<String, dynamic>>.from(data['conflict_history'] ?? []);
      }

      return [];
    } catch (e) {
      print("[SystemService] Error getting conflicts: $e");
      return [];
    }
  }
}
