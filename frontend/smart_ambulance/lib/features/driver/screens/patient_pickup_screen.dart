import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/primary_button.dart';
import '../providers/trip_provider.dart';

/// Patient Pickup Confirmation Screen
/// Simple confirmation card with "Patient Onboard" button
class PatientPickupScreen extends StatefulWidget {
  const PatientPickupScreen({super.key});

  @override
  State<PatientPickupScreen> createState() => _PatientPickupScreenState();
}

class _PatientPickupScreenState extends State<PatientPickupScreen> {
  bool _isLoading = false;

  Future<void> _confirmPatientOnboard() async {
    setState(() => _isLoading = true);

    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final success = await tripProvider.confirmPickup();

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        Navigator.pushReplacementNamed(context, '/navigation-hospital');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to confirm patient pickup')),
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
        final hospital = trip?.hospital;

        final location = emergency?.locationAddress ?? 'Accident Location';
        final victims = emergency?.reportedVictims ?? 1;
        final hospitalName = hospital?.name ?? 'Apollo Hospital';

        // Calculate distance from emergency to hospital if not provided
        double distanceKm = trip?.distanceToHospitalKm ?? 0;
        if (distanceKm <= 0 && emergency != null && hospital != null) {
          // Calculate using simple Euclidean approximation (111km per degree)
          final latDiff = (hospital.lat - emergency.locationLat).abs();
          final lngDiff = (hospital.lng - emergency.locationLng).abs();
          final distDegrees = (latDiff * latDiff + lngDiff * lngDiff);
          distanceKm = distDegrees * 111.0; // Convert to km
          distanceKm =
              distanceKm.clamp(0.5, 15.0); // Clamp for realistic values
        }
        if (distanceKm <= 0) distanceKm = 2.5; // Fallback for demo

        // Calculate ETA (assume 40 km/h average speed in city)
        int etaMins = trip?.etaToHospitalMinutes ?? 0;
        if (etaMins <= 0) {
          etaMins = ((distanceKm / 40) * 60).round().clamp(3, 15);
        }

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            title: const Text('At Accident Location'),
            automaticallyImplyLeading: false,
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Success indicator
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.available.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.location_on,
                      size: 50,
                      color: AppColors.available,
                    ),
                  ),

                  const SizedBox(height: 32),

                  const Text(
                    'Arrived at Location',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),

                  const SizedBox(height: 12),

                  Text(
                    location,
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.text.withOpacity(0.7),
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Patient info card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.person,
                                color: AppColors.accent,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Patient Information',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.text,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$victims victim(s) reported at scene',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      color: AppColors.text,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Divider(),
                        const SizedBox(height: 16),
                        _buildInfoRow(Icons.local_hospital, 'Nearest Hospital',
                            hospitalName),
                        const SizedBox(height: 12),
                        _buildInfoRow(Icons.straighten, 'Distance',
                            '${distanceKm.toStringAsFixed(1)} km'),
                        const SizedBox(height: 12),
                        _buildInfoRow(
                            Icons.timer, 'Estimated Time', '$etaMins mins'),
                      ],
                    ),
                  ),

                  const Spacer(),

                  // Patient Onboard button
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: PrimaryButton(
                      label: 'Patient Onboard',
                      onPressed: _isLoading ? null : _confirmPatientOnboard,
                      isEmergency: true,
                      icon: Icons.medical_services,
                      isLoading: _isLoading,
                    ),
                  ),

                  const SizedBox(height: 16),

                  Text(
                    'Confirm patient is loaded to proceed',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.text.withOpacity(0.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.text.withOpacity(0.7),
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
        ),
      ],
    );
  }
}
