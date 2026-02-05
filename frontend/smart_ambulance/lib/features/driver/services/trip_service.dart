import 'dart:convert';
import '../../../core/services/api_service.dart';

/// Model class for Trip data
class TripData {
  final String id;
  final String emergencyId;
  final String ambulanceId;
  final String? hospitalId;
  final String state;
  final double? etaToScene;
  final double? etaToHospital;
  final double? distanceToScene;
  final double? distanceToHospital;
  final int signalsPreempted;
  final EmergencyData? emergency;
  final HospitalData? hospital;

  TripData({
    required this.id,
    required this.emergencyId,
    required this.ambulanceId,
    this.hospitalId,
    required this.state,
    this.etaToScene,
    this.etaToHospital,
    this.distanceToScene,
    this.distanceToHospital,
    this.signalsPreempted = 0,
    this.emergency,
    this.hospital,
  });

  factory TripData.fromJson(Map<String, dynamic> json) {
    return TripData(
      id: json['id'] ?? '',
      emergencyId: json['emergency_id'] ?? '',
      ambulanceId: json['ambulance_id'] ?? '',
      hospitalId: json['hospital_id'],
      state: json['state'] ?? 'PENDING',
      etaToScene: (json['eta_to_scene'] as num?)?.toDouble(),
      etaToHospital: (json['eta_to_hospital'] as num?)?.toDouble(),
      distanceToScene: (json['distance_to_scene'] as num?)?.toDouble(),
      distanceToHospital: (json['distance_to_hospital'] as num?)?.toDouble(),
      signalsPreempted: json['signals_preempted'] ?? 0,
      emergency: json['emergency'] != null
          ? EmergencyData.fromJson(json['emergency'])
          : null,
      hospital: json['hospital'] != null
          ? HospitalData.fromJson(json['hospital'])
          : null,
    );
  }

  // Helper to check trip state
  bool get isPending => state == 'PENDING';
  bool get isAccepted => state == 'ACCEPTED';
  bool get isEnRouteToScene => state == 'EN_ROUTE_TO_SCENE';
  bool get isAtScene => state == 'AT_SCENE';
  bool get isPatientOnboard => state == 'PATIENT_ONBOARD';
  bool get isEnRouteToHospital => state == 'EN_ROUTE_TO_HOSPITAL';
  bool get isCompleted => state == 'COMPLETED';
  bool get isCancelled => state == 'CANCELLED';

  // ETA in minutes
  int get etaToSceneMinutes => ((etaToScene ?? 0) / 60).round();
  int get etaToHospitalMinutes => ((etaToHospital ?? 0) / 60).round();

  // Distance in km
  double get distanceToSceneKm => (distanceToScene ?? 0) / 1000;
  double get distanceToHospitalKm => (distanceToHospital ?? 0) / 1000;

  // CopyWith for state updates
  TripData copyWith({
    String? id,
    String? emergencyId,
    String? ambulanceId,
    String? hospitalId,
    String? state,
    double? etaToScene,
    double? etaToHospital,
    double? distanceToScene,
    double? distanceToHospital,
    int? signalsPreempted,
    EmergencyData? emergency,
    HospitalData? hospital,
  }) {
    return TripData(
      id: id ?? this.id,
      emergencyId: emergencyId ?? this.emergencyId,
      ambulanceId: ambulanceId ?? this.ambulanceId,
      hospitalId: hospitalId ?? this.hospitalId,
      state: state ?? this.state,
      etaToScene: etaToScene ?? this.etaToScene,
      etaToHospital: etaToHospital ?? this.etaToHospital,
      distanceToScene: distanceToScene ?? this.distanceToScene,
      distanceToHospital: distanceToHospital ?? this.distanceToHospital,
      signalsPreempted: signalsPreempted ?? this.signalsPreempted,
      emergency: emergency ?? this.emergency,
      hospital: hospital ?? this.hospital,
    );
  }
}

class EmergencyData {
  final String id;
  final double locationLat;
  final double locationLng;
  final String? locationAddress;
  final String emergencyType;
  final String severity;
  final String? description;
  final int reportedVictims;
  final String? callerName;

  EmergencyData({
    required this.id,
    required this.locationLat,
    required this.locationLng,
    this.locationAddress,
    required this.emergencyType,
    required this.severity,
    this.description,
    this.reportedVictims = 1,
    this.callerName,
  });

  factory EmergencyData.fromJson(Map<String, dynamic> json) {
    return EmergencyData(
      id: json['id'] ?? '',
      locationLat: (json['location_lat'] as num?)?.toDouble() ?? 0,
      locationLng: (json['location_lng'] as num?)?.toDouble() ?? 0,
      locationAddress: json['location_address'],
      emergencyType: json['emergency_type'] ?? 'ACCIDENT',
      severity: json['severity'] ?? 'HIGH',
      description: json['description'],
      reportedVictims: json['reported_victims'] ?? 1,
      callerName: json['caller_name'],
    );
  }
}

class HospitalData {
  final String id;
  final String name;
  final String? address;
  final double lat;
  final double lng;
  final int totalBeds;
  final int availableBeds;
  final String? phone;

  HospitalData({
    required this.id,
    required this.name,
    this.address,
    required this.lat,
    required this.lng,
    this.totalBeds = 0,
    this.availableBeds = 0,
    this.phone,
  });

  factory HospitalData.fromJson(Map<String, dynamic> json) {
    return HospitalData(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Unknown Hospital',
      address: json['address'],
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      totalBeds: json['total_beds'] ?? 0,
      availableBeds: json['available_beds'] ?? 0,
      phone: json['phone'],
    );
  }
}

/// Handles all trip-related backend communication for driver
class TripService {
  /// Fetch active trips for this ambulance
  static Future<TripData?> getActiveTrip() async {
    final ambulanceId = ApiService.ambulanceId;
    if (ambulanceId == null) {
      print("[TripService] No ambulance ID - not logged in");
      return null;
    }

    print("[TripService] Checking for trips assigned to: $ambulanceId");

    try {
      // Primary: Use authenticated /ambulances/{id}/trip endpoint
      final response = await ApiService.get("/ambulances/$ambulanceId/trip");
      print("[TripService] /ambulances/$ambulanceId/trip response: ${response.statusCode}");

      if (ApiService.isSuccess(response)) {
        final body = response.body;
        if (body.isNotEmpty && body != 'null') {
          final tripData = jsonDecode(body);
          if (tripData != null && tripData is Map) {
            print("[TripService] Found trip: ${tripData['id']}");
            return TripData.fromJson(Map<String, dynamic>.from(tripData));
          }
        }
      }
      
      // Fallback: Use dashboard active-trips (no auth required)
      print("[TripService] Trying fallback /dashboard/active-trips");
      final fallbackResponse = await ApiService.get("/dashboard/active-trips");
      
      if (ApiService.isSuccess(fallbackResponse)) {
        final List<dynamic> trips = jsonDecode(fallbackResponse.body);
        print("[TripService] Found ${trips.length} active trips in dashboard");
        
        // Find trip for this ambulance
        for (final trip in trips) {
          final tripAmbId = trip['ambulance_id'] ?? '';
          final tripAmbNum = trip['ambulance_number'] ?? '';
          
          print("[TripService] Checking trip ${trip['trip_id']} - amb: $tripAmbId / $tripAmbNum");
          
          if (tripAmbId == ambulanceId || tripAmbNum == ambulanceId) {
            print("[TripService] Match found! Fetching full trip details...");
            
            // Fetch full trip details
            final tripId = trip['trip_id'];
            final tripResponse = await ApiService.get("/trips/$tripId");

            if (ApiService.isSuccess(tripResponse)) {
              return TripData.fromJson(jsonDecode(tripResponse.body));
            }
            
            // If can't get full details, use what we have
            return TripData(
              id: tripId,
              emergencyId: trip['emergency_id'] ?? '',
              ambulanceId: ambulanceId,
              state: trip['state'] ?? 'PENDING',
            );
          }
        }
      }

      print("[TripService] No trip found for $ambulanceId");
      return null;
    } catch (e) {
      print("[TripService] Error fetching active trip: $e");
      return null;
    }
  }

  /// Accept a trip assignment
  static Future<TripData?> acceptTrip(String tripId) async {
    try {
      final response = await ApiService.put("/trips/$tripId/accept");

      if (ApiService.isSuccess(response)) {
        return TripData.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      print("[TripService] Accept trip error: $e");
      return null;
    }
  }

  /// Mark arrived at scene
  static Future<TripData?> arriveAtScene(String tripId) async {
    try {
      final response = await ApiService.put("/trips/$tripId/arrive-scene");

      if (ApiService.isSuccess(response)) {
        return TripData.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      print("[TripService] Arrive at scene error: $e");
      return null;
    }
  }

  /// Mark patient onboard
  static Future<TripData?> patientOnboard(String tripId) async {
    try {
      final response = await ApiService.put("/trips/$tripId/patient-onboard");

      if (ApiService.isSuccess(response)) {
        return TripData.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      print("[TripService] Patient onboard error: $e");
      return null;
    }
  }

  /// Mark arrived at hospital
  static Future<TripData?> arriveAtHospital(String tripId) async {
    try {
      final response = await ApiService.put("/trips/$tripId/arrive-hospital");

      if (ApiService.isSuccess(response)) {
        return TripData.fromJson(jsonDecode(response.body));
      }
      return null;
    } catch (e) {
      print("[TripService] Arrive at hospital error: $e");
      return null;
    }
  }

  /// Complete the trip
  static Future<bool> completeTrip(String tripId) async {
    try {
      final response = await ApiService.put("/trips/$tripId/complete");
      return ApiService.isSuccess(response);
    } catch (e) {
      print("[TripService] Complete trip error: $e");
      return false;
    }
  }

  /// Update ambulance location
  static Future<void> updateLocation(double lat, double lng) async {
    final ambulanceId = ApiService.ambulanceId;
    if (ambulanceId == null) return;

    try {
      await ApiService.post(
        "/ambulances/$ambulanceId/location",
        {
          "lat": lat,
          "lng": lng,
        },
      );
    } catch (e) {
      print("[TripService] Location update error: $e");
    }
  }

  /// Update ambulance status (AVAILABLE, OFFLINE)
  static Future<bool> updateStatus(String status) async {
    final ambulanceId = ApiService.ambulanceId;
    if (ambulanceId == null) return false;

    try {
      final response = await ApiService.put(
        "/ambulances/$ambulanceId/status?status=$status",
      );
      return ApiService.isSuccess(response);
    } catch (e) {
      print("[TripService] Status update error: $e");
      return false;
    }
  }

  /// Get signals on route (for green corridor)
  static Future<List<Map<String, dynamic>>> getRouteSignals(
      String tripId) async {
    try {
      final response = await ApiService.get("/trips/$tripId/route-signals");

      if (ApiService.isSuccess(response)) {
        final List<dynamic> signals = jsonDecode(response.body);
        return signals.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      print("[TripService] Get route signals error: $e");
      return [];
    }
  }
}
