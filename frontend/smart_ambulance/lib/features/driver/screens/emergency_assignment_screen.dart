import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/osm_navigation_map.dart';
import '../../../shared/widgets/primary_button.dart';
import '../providers/trip_provider.dart';

/// Emergency Assignment Screen
/// Shows assigned emergency details with map and start navigation button
class EmergencyAssignmentScreen extends StatefulWidget {
  const EmergencyAssignmentScreen({super.key});

  @override
  State<EmergencyAssignmentScreen> createState() =>
      _EmergencyAssignmentScreenState();
}

class _EmergencyAssignmentScreenState extends State<EmergencyAssignmentScreen> {
  bool _isAccepting = false;

  @override
  void initState() {
    super.initState();
    // Check if trip is already accepted and navigate
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkTripState();
    });
  }

  void _checkTripState() {
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final state = tripProvider.tripState;

    // If trip is already accepted/in progress, navigate to appropriate screen
    if (state == 'ACCEPTED' || state == 'EN_ROUTE_TO_SCENE') {
      Navigator.pushReplacementNamed(context, '/navigation-accident');
    } else if (state == 'AT_SCENE') {
      Navigator.pushReplacementNamed(context, '/patient-pickup');
    } else if (state == 'PATIENT_ONBOARD' || state == 'EN_ROUTE_TO_HOSPITAL') {
      Navigator.pushReplacementNamed(context, '/navigation-hospital');
    }
  }

  Future<void> _acceptAndNavigate() async {
    setState(() => _isAccepting = true);

    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final success = await tripProvider.acceptTrip();

    if (mounted) {
      setState(() => _isAccepting = false);
      if (success) {
        Navigator.pushReplacementNamed(context, '/navigation-accident');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to accept trip')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TripProvider>(
      builder: (context, tripProvider, child) {
        final trip = tripProvider.activeTrip;
        final emergency = trip?.emergency;

        // Extract data from trip
        final emergencyType = emergency?.emergencyType ?? 'ACCIDENT';
        final location = emergency?.locationAddress ?? 'Chennai';
        final distance =
            trip?.distanceToSceneKm != null && trip!.distanceToSceneKm > 0
                ? trip.distanceToSceneKm.toStringAsFixed(1)
                : '2.5';
        final eta =
            trip?.etaToSceneMinutes != null && trip!.etaToSceneMinutes > 0
                ? trip.etaToSceneMinutes
                : 5;
        final victims = emergency?.reportedVictims ?? 1;
        final severity = emergency?.severity ?? 'HIGH';

        // Use actual coordinates from emergency or fallback
        final patientLat = emergency?.locationLat ?? 13.0827;
        final patientLng = emergency?.locationLng ?? 80.2357;
        final ambulanceLat =
            patientLat - 0.02; // Ambulance starts south of patient
        final ambulanceLng = patientLng - 0.015;
        const hospitalLat = 13.0547;
        const hospitalLng = 80.2526;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Emergency Assigned'),
            backgroundColor: AppColors.accent,
            automaticallyImplyLeading: false,
          ),
          body: Column(
            children: [
              // Emergency alert banner
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.accent.withOpacity(0.2),
                      AppColors.accent.withOpacity(0.1),
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accent.withOpacity(0.4),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.warning_rounded,
                        color: AppColors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                emergencyType,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.text,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: _getSeverityColor(severity),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  severity,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.location_on,
                                size: 14,
                                color: AppColors.text.withOpacity(0.6),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  location,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.text.withOpacity(0.7),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Map view with OpenStreetMap
              Expanded(
                child: OSMNavigationMap(
                  ambulanceLat: ambulanceLat,
                  ambulanceLng: ambulanceLng,
                  patientLat: patientLat,
                  patientLng: patientLng,
                  hospitalLat: hospitalLat,
                  hospitalLng: hospitalLng,
                  destinationName: location,
                  showRoute: true,
                  isGreenCorridor: severity == 'CRITICAL' || severity == 'HIGH',
                  tripState: 'EN_ROUTE_TO_PATIENT',
                  prioritySignalIds: severity == 'CRITICAL'
                      ? ['SIG-001', 'SIG-003', 'SIG-005']
                      : [],
                ),
              ),

              // Trip info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    _InfoTile(
                      icon: Icons.straighten,
                      label: 'Distance',
                      value: '$distance km',
                      color: AppColors.primary,
                    ),
                    Container(
                      height: 40,
                      width: 1,
                      color: AppColors.secondary.withOpacity(0.3),
                    ),
                    _InfoTile(
                      icon: Icons.timer,
                      label: 'ETA',
                      value: '$eta min',
                      color: AppColors.accent,
                    ),
                    Container(
                      height: 40,
                      width: 1,
                      color: AppColors.secondary.withOpacity(0.3),
                    ),
                    _InfoTile(
                      icon: Icons.people,
                      label: 'Victims',
                      value: '$victims',
                      color: Colors.purple,
                    ),
                  ],
                ),
              ),

              // Start navigation button
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: SafeArea(
                  top: false,
                  child: PrimaryButton(
                    label: _isAccepting
                        ? 'Accepting...'
                        : 'Accept & Start Navigation',
                    onPressed: _isAccepting ? null : _acceptAndNavigate,
                    isEmergency: true,
                    icon: Icons.navigation,
                    isLoading: _isAccepting,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Color _getSeverityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return Colors.red.shade700;
      case 'HIGH':
        return Colors.orange.shade700;
      case 'MODERATE':
        return Colors.amber.shade700;
      default:
        return Colors.blue.shade700;
    }
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: AppColors.text.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }
}
