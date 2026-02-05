/// Ambulance model matching backend ambulance.json structure exactly
/// Used for static data authentication in Phase 1
class Ambulance {
  final String ambulanceId;
  final String plateNumber;
  final String hospitalId;
  final String type; // ALS or BLS
  final String secret;
  final String status; // active, inactive, maintenance

  const Ambulance({
    required this.ambulanceId,
    required this.plateNumber,
    required this.hospitalId,
    required this.type,
    required this.secret,
    required this.status,
  });

  /// Check if ambulance is currently active
  bool get isActive => status == 'active';

  /// Get ambulance type description
  String get typeDescription {
    switch (type) {
      case 'ALS':
        return 'Advanced Life Support';
      case 'BLS':
        return 'Basic Life Support';
      default:
        return type;
    }
  }

  /// Create from JSON map
  factory Ambulance.fromJson(Map<String, dynamic> json) {
    return Ambulance(
      ambulanceId: json['ambulance_id'] as String,
      plateNumber: json['plate_number'] as String,
      hospitalId: json['hospital_id'] as String,
      type: json['type'] as String,
      secret: json['secret'] as String,
      status: json['status'] as String,
    );
  }

  /// Convert to JSON map
  Map<String, dynamic> toJson() {
    return {
      'ambulance_id': ambulanceId,
      'plate_number': plateNumber,
      'hospital_id': hospitalId,
      'type': type,
      'secret': secret,
      'status': status,
    };
  }

  @override
  String toString() {
    return 'Ambulance(id: $ambulanceId, plate: $plateNumber, type: $type, status: $status)';
  }
}
