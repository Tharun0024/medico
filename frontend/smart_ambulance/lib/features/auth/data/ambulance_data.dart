import '../models/ambulance.dart';

/// Static list of Ambulance objects
/// Exact replica of backend/app/data/ambulance.json
/// DO NOT modify fields or structure - must match backend contract
class AmbulanceData {
  AmbulanceData._();

  static const List<Ambulance> ambulances = [
    // Hospital HOSP-001 ambulances
    Ambulance(
      ambulanceId: 'AMB_001',
      plateNumber: 'TN01AB1001',
      hospitalId: 'HOSP-001',
      type: 'ALS',
      secret: 'sec-amb-001',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_002',
      plateNumber: 'TN01AB1002',
      hospitalId: 'HOSP-001',
      type: 'BLS',
      secret: 'sec-amb-002',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_003',
      plateNumber: 'TN01AB1003',
      hospitalId: 'HOSP-001',
      type: 'ALS',
      secret: 'sec-amb-003',
      status: 'active',
    ),

    // Hospital HOSP-002 ambulances
    Ambulance(
      ambulanceId: 'AMB_004',
      plateNumber: 'TN02CD2001',
      hospitalId: 'HOSP-002',
      type: 'ALS',
      secret: 'sec-amb-004',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_005',
      plateNumber: 'TN02CD2002',
      hospitalId: 'HOSP-002',
      type: 'BLS',
      secret: 'sec-amb-005',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_006',
      plateNumber: 'TN02CD2003',
      hospitalId: 'HOSP-002',
      type: 'BLS',
      secret: 'sec-amb-006',
      status: 'active',
    ),

    // Hospital HOSP-003 ambulances
    Ambulance(
      ambulanceId: 'AMB_007',
      plateNumber: 'TN03EF3001',
      hospitalId: 'HOSP-003',
      type: 'ALS',
      secret: 'sec-amb-007',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_008',
      plateNumber: 'TN03EF3002',
      hospitalId: 'HOSP-003',
      type: 'ALS',
      secret: 'sec-amb-008',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_009',
      plateNumber: 'TN03EF3003',
      hospitalId: 'HOSP-003',
      type: 'BLS',
      secret: 'sec-amb-009',
      status: 'active',
    ),

    // Hospital HOSP-004 ambulances
    Ambulance(
      ambulanceId: 'AMB_010',
      plateNumber: 'TN04GH4001',
      hospitalId: 'HOSP-004',
      type: 'ALS',
      secret: 'sec-amb-010',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_011',
      plateNumber: 'TN04GH4002',
      hospitalId: 'HOSP-004',
      type: 'BLS',
      secret: 'sec-amb-011',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_012',
      plateNumber: 'TN04GH4003',
      hospitalId: 'HOSP-004',
      type: 'BLS',
      secret: 'sec-amb-012',
      status: 'active',
    ),

    // Hospital HOSP-005 ambulances
    Ambulance(
      ambulanceId: 'AMB_013',
      plateNumber: 'TN05IJ5001',
      hospitalId: 'HOSP-005',
      type: 'ALS',
      secret: 'sec-amb-013',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_014',
      plateNumber: 'TN05IJ5002',
      hospitalId: 'HOSP-005',
      type: 'BLS',
      secret: 'sec-amb-014',
      status: 'active',
    ),
    Ambulance(
      ambulanceId: 'AMB_015',
      plateNumber: 'TN05IJ5003',
      hospitalId: 'HOSP-005',
      type: 'BLS',
      secret: 'sec-amb-015',
      status: 'active',
    ),
  ];

  /// Find ambulance by ID
  static Ambulance? findById(String ambulanceId) {
    try {
      return ambulances.firstWhere((a) => a.ambulanceId == ambulanceId);
    } catch (_) {
      return null;
    }
  }

  /// Find ambulance by ID and secret (for authentication)
  static Ambulance? authenticate(String ambulanceId, String secret) {
    try {
      return ambulances.firstWhere(
        (a) => a.ambulanceId == ambulanceId && a.secret == secret,
      );
    } catch (_) {
      return null;
    }
  }

  /// Get all ambulances for a hospital
  static List<Ambulance> getByHospital(String hospitalId) {
    return ambulances.where((a) => a.hospitalId == hospitalId).toList();
  }

  /// Get all active ambulances
  static List<Ambulance> getActiveAmbulances() {
    return ambulances.where((a) => a.isActive).toList();
  }
}
