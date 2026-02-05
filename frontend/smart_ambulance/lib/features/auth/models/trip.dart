/// Trip model for mocked patient assignment
/// Links to ambulance via ambulance_id
class Trip {
  final String tripId;
  final String ambulanceId;
  final Patient patient;
  final Location pickupLocation;
  final Location hospitalLocation;
  final String hospitalName;
  final TripStatus status;
  final DateTime assignedAt;
  final String? eta; // Estimated time of arrival
  final String routeStatus; // NORMAL, RE-ROUTED, DELAYED
  final String? trafficAlert;

  const Trip({
    required this.tripId,
    required this.ambulanceId,
    required this.patient,
    required this.pickupLocation,
    required this.hospitalLocation,
    required this.hospitalName,
    required this.status,
    required this.assignedAt,
    this.eta,
    this.routeStatus = 'NORMAL',
    this.trafficAlert,
  });

  /// Create a copy with updated fields (for route-change simulation)
  Trip copyWith({
    String? tripId,
    String? ambulanceId,
    Patient? patient,
    Location? pickupLocation,
    Location? hospitalLocation,
    String? hospitalName,
    TripStatus? status,
    DateTime? assignedAt,
    String? eta,
    String? routeStatus,
    String? trafficAlert,
  }) {
    return Trip(
      tripId: tripId ?? this.tripId,
      ambulanceId: ambulanceId ?? this.ambulanceId,
      patient: patient ?? this.patient,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      hospitalLocation: hospitalLocation ?? this.hospitalLocation,
      hospitalName: hospitalName ?? this.hospitalName,
      status: status ?? this.status,
      assignedAt: assignedAt ?? this.assignedAt,
      eta: eta ?? this.eta,
      routeStatus: routeStatus ?? this.routeStatus,
      trafficAlert: trafficAlert ?? this.trafficAlert,
    );
  }
}

/// Patient information for a trip
class Patient {
  final String name;
  final int age;
  final String gender;
  final String condition;
  final String severity; // CRITICAL, SERIOUS, MODERATE, MINOR
  final String? contactNumber;
  final String? bloodGroup;

  const Patient({
    required this.name,
    required this.age,
    required this.gender,
    required this.condition,
    required this.severity,
    this.contactNumber,
    this.bloodGroup,
  });

  /// Get severity color indicator
  String get severityLevel {
    switch (severity) {
      case 'CRITICAL':
        return '🔴 Critical';
      case 'SERIOUS':
        return '🟠 Serious';
      case 'MODERATE':
        return '🟡 Moderate';
      case 'MINOR':
        return '🟢 Minor';
      default:
        return severity;
    }
  }
}

/// Location model for pickup and destination
class Location {
  final String address;
  final String landmark;
  final double latitude;
  final double longitude;

  const Location({
    required this.address,
    required this.landmark,
    required this.latitude,
    required this.longitude,
  });
}

/// Trip status enum
enum TripStatus {
  assigned,    // Trip just assigned to ambulance
  enRoute,     // Ambulance en route to pickup
  arrived,     // Arrived at pickup location
  patientOnboard, // Patient picked up, heading to hospital
  completed,   // Trip completed
  cancelled,   // Trip cancelled
}

/// Extension for TripStatus display
extension TripStatusExtension on TripStatus {
  String get displayName {
    switch (this) {
      case TripStatus.assigned:
        return 'Assigned';
      case TripStatus.enRoute:
        return 'En Route to Pickup';
      case TripStatus.arrived:
        return 'Arrived at Pickup';
      case TripStatus.patientOnboard:
        return 'Patient Onboard';
      case TripStatus.completed:
        return 'Completed';
      case TripStatus.cancelled:
        return 'Cancelled';
    }
  }

  String get icon {
    switch (this) {
      case TripStatus.assigned:
        return '📋';
      case TripStatus.enRoute:
        return '🚑';
      case TripStatus.arrived:
        return '📍';
      case TripStatus.patientOnboard:
        return '🏥';
      case TripStatus.completed:
        return '✅';
      case TripStatus.cancelled:
        return '❌';
    }
  }
}
