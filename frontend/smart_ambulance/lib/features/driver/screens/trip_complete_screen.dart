import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/primary_button.dart';
import '../providers/trip_provider.dart';

/// Trip Completion Screen
/// Shows success message and button to complete trip
class TripCompleteScreen extends StatefulWidget {
  const TripCompleteScreen({super.key});

  @override
  State<TripCompleteScreen> createState() => _TripCompleteScreenState();
}

class _TripCompleteScreenState extends State<TripCompleteScreen> {
  bool _isCompleting = false;

  Future<void> _completeTrip() async {
    setState(() => _isCompleting = true);

    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final success = await tripProvider.completeTrip();

    if (mounted) {
      if (success) {
        // Navigate back to home screen and clear stack
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/home',
          (route) => false,
        );
      } else {
        setState(() => _isCompleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to complete trip')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TripProvider>(
      builder: (context, tripProvider, child) {
        final trip = tripProvider.activeTrip;
        final hospitalName = trip?.hospital?.name ?? 'Hospital';
        final signalsPreempted = trip?.signalsPreempted ?? 0;
        
        // Calculate totals from trip data
        final totalDistance = (trip?.distanceToSceneKm ?? 0) + (trip?.distanceToHospitalKm ?? 0);
        final totalTime = (trip?.etaToSceneMinutes ?? 0) + (trip?.etaToHospitalMinutes ?? 0);
        final timeSaved = (signalsPreempted * 2).clamp(0, 10); // ~2 min per signal

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Spacer(),

                  // Success animation / icon
                  Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      color: AppColors.available.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          color: AppColors.available,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.available.withOpacity(0.3),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.check,
                          size: 60,
                          color: AppColors.white,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 48),

                  // Success message
                  const Text(
                    'Reached Hospital',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 16),

                  Text(
                    'Patient successfully delivered to\n$hospitalName',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.text.withOpacity(0.7),
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 40),

                  // Trip summary card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Trip Summary',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildSummaryRow('Total Distance', '${totalDistance.toStringAsFixed(1)} km'),
                        const SizedBox(height: 10),
                        _buildSummaryRow('Total Time', '$totalTime mins'),
                        const SizedBox(height: 10),
                        _buildSummaryRow('Signals Pre-empted', '$signalsPreempted'),
                        const SizedBox(height: 10),
                        _buildSummaryRow(
                          'Time Saved',
                          '~$timeSaved mins',
                          valueColor: AppColors.available,
                        ),
                      ],
                    ),
                  ),

                  const Spacer(),

                  // Complete Trip button
                  PrimaryButton(
                    label: 'Complete Trip',
                    onPressed: _isCompleting ? null : _completeTrip,
                    icon: Icons.done_all,
                    isLoading: _isCompleting,
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.text.withOpacity(0.7),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: valueColor ?? AppColors.text,
          ),
        ),
      ],
    );
  }
}
