import '../models/trip.dart';

/// Mock Trip data linked by ambulance_id
/// Used for Phase 1 static data demonstration
class MockTripData {
  MockTripData._();

  /// Mock trips for different ambulances
  static final List<Trip> trips = [
    // Trip for AMB_001
    Trip(
      tripId: 'TRIP_001',
      ambulanceId: 'AMB_001',
      patient: const Patient(
        name: 'Rajesh Kumar',
        age: 45,
        gender: 'Male',
        condition: 'Cardiac Arrest',
        severity: 'CRITICAL',
        contactNumber: '+91 98765 43210',
        bloodGroup: 'O+',
      ),
      pickupLocation: const Location(
        address: '42, Anna Nagar East, Chennai',
        landmark: 'Near Anna Arch',
        latitude: 13.0850,
        longitude: 80.2101,
      ),
      hospitalLocation: const Location(
        address: 'Apollo Hospital, Greams Road',
        landmark: 'Greams Road Junction',
        latitude: 13.0569,
        longitude: 80.2425,
      ),
      hospitalName: 'Apollo Hospital - Greams Road',
      status: TripStatus.assigned,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 5)),
      eta: '12 mins',
      routeStatus: 'NORMAL',
    ),

    // Trip for AMB_002
    Trip(
      tripId: 'TRIP_002',
      ambulanceId: 'AMB_002',
      patient: const Patient(
        name: 'Lakshmi Devi',
        age: 62,
        gender: 'Female',
        condition: 'Breathing Difficulty',
        severity: 'SERIOUS',
        contactNumber: '+91 87654 32109',
        bloodGroup: 'A+',
      ),
      pickupLocation: const Location(
        address: '15, T. Nagar, Chennai',
        landmark: 'Near Pondy Bazaar',
        latitude: 13.0418,
        longitude: 80.2341,
      ),
      hospitalLocation: const Location(
        address: 'MIOT Hospital, Mount Poonamallee Road',
        landmark: 'Near Ramapuram',
        latitude: 13.0339,
        longitude: 80.1815,
      ),
      hospitalName: 'MIOT International Hospital',
      status: TripStatus.enRoute,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 10)),
      eta: '8 mins',
      routeStatus: 'NORMAL',
    ),

    // Trip for AMB_004
    Trip(
      tripId: 'TRIP_003',
      ambulanceId: 'AMB_004',
      patient: const Patient(
        name: 'Mohammed Ismail',
        age: 28,
        gender: 'Male',
        condition: 'Road Accident - Multiple Injuries',
        severity: 'CRITICAL',
        contactNumber: '+91 76543 21098',
        bloodGroup: 'B+',
      ),
      pickupLocation: const Location(
        address: 'OMR Junction, Sholinganallur',
        landmark: 'Near IT Corridor',
        latitude: 12.9010,
        longitude: 80.2279,
      ),
      hospitalLocation: const Location(
        address: 'Fortis Malar Hospital, Adyar',
        landmark: 'Gandhi Nagar',
        latitude: 13.0067,
        longitude: 80.2578,
      ),
      hospitalName: 'Fortis Malar Hospital',
      status: TripStatus.patientOnboard,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 20)),
      eta: '15 mins',
      routeStatus: 'NORMAL',
    ),

    // Trip for AMB_007
    Trip(
      tripId: 'TRIP_004',
      ambulanceId: 'AMB_007',
      patient: const Patient(
        name: 'Priya Sharma',
        age: 35,
        gender: 'Female',
        condition: 'Pregnancy Complication',
        severity: 'SERIOUS',
        contactNumber: '+91 65432 10987',
        bloodGroup: 'AB+',
      ),
      pickupLocation: const Location(
        address: '88, Velachery Main Road',
        landmark: 'Near Phoenix Mall',
        latitude: 12.9815,
        longitude: 80.2180,
      ),
      hospitalLocation: const Location(
        address: 'Cloudnine Hospital, OMR',
        landmark: 'Perungudi',
        latitude: 12.9634,
        longitude: 80.2429,
      ),
      hospitalName: 'Cloudnine Hospital - OMR',
      status: TripStatus.assigned,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 2)),
      eta: '10 mins',
      routeStatus: 'NORMAL',
    ),

    // Trip for AMB_010
    Trip(
      tripId: 'TRIP_005',
      ambulanceId: 'AMB_010',
      patient: const Patient(
        name: 'Suresh Babu',
        age: 55,
        gender: 'Male',
        condition: 'Stroke Symptoms',
        severity: 'CRITICAL',
        contactNumber: '+91 54321 09876',
        bloodGroup: 'O-',
      ),
      pickupLocation: const Location(
        address: '23, Mylapore, Chennai',
        landmark: 'Near Kapaleeshwarar Temple',
        latitude: 13.0339,
        longitude: 80.2676,
      ),
      hospitalLocation: const Location(
        address: 'Kauvery Hospital, Alwarpet',
        landmark: 'TTK Road',
        latitude: 13.0363,
        longitude: 80.2501,
      ),
      hospitalName: 'Kauvery Hospital - Alwarpet',
      status: TripStatus.enRoute,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 8)),
      eta: '6 mins',
      routeStatus: 'NORMAL',
    ),

    // Trip for AMB_013
    Trip(
      tripId: 'TRIP_006',
      ambulanceId: 'AMB_013',
      patient: const Patient(
        name: 'Anitha Rajan',
        age: 42,
        gender: 'Female',
        condition: 'Severe Allergic Reaction',
        severity: 'MODERATE',
        contactNumber: '+91 43210 98765',
        bloodGroup: 'A-',
      ),
      pickupLocation: const Location(
        address: '56, Adyar, Chennai',
        landmark: 'Near IIT Madras',
        latitude: 13.0108,
        longitude: 80.2350,
      ),
      hospitalLocation: const Location(
        address: 'Vijaya Hospital, Vadapalani',
        landmark: 'Arcot Road',
        latitude: 13.0521,
        longitude: 80.2123,
      ),
      hospitalName: 'Vijaya Hospital',
      status: TripStatus.arrived,
      assignedAt: DateTime.now().subtract(const Duration(minutes: 15)),
      eta: '2 mins',
      routeStatus: 'NORMAL',
    ),
  ];

  /// Get trip for a specific ambulance
  static Trip? getTripForAmbulance(String ambulanceId) {
    try {
      return trips.firstWhere((t) => t.ambulanceId == ambulanceId);
    } catch (_) {
      return null;
    }
  }

  /// Get all active trips (not completed or cancelled)
  static List<Trip> getActiveTrips() {
    return trips.where((t) => 
      t.status != TripStatus.completed && 
      t.status != TripStatus.cancelled
    ).toList();
  }

  /// Get trip by ID
  static Trip? getTripById(String tripId) {
    try {
      return trips.firstWhere((t) => t.tripId == tripId);
    } catch (_) {
      return null;
    }
  }

  /// Simulate route change - returns updated trip with new ETA and alert
  static Trip simulateRouteChange(Trip trip) {
    // Simulate traffic-based route change
    final trafficAlerts = [
      'Heavy traffic detected on Anna Salai. Route changed via Mount Road.',
      'Accident reported ahead. Diverting through Inner Ring Road.',
      'Road closure due to VIP movement. Alternative route via ECR.',
      'Waterlogging detected. Re-routing through elevated corridor.',
      'Signal failure at junction. Taking bypass road.',
    ];

    final newEtas = ['18 mins', '22 mins', '15 mins', '20 mins', '25 mins'];
    
    // Random selection for simulation
    final index = DateTime.now().millisecond % trafficAlerts.length;
    
    return trip.copyWith(
      routeStatus: 'RE-ROUTED',
      eta: newEtas[index],
      trafficAlert: trafficAlerts[index],
    );
  }
}
