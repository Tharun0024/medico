import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/osm_navigation_map.dart';
import '../providers/trip_provider.dart';

/// Navigation to Hospital Screen (Core Demo Screen)
/// Full-screen map with green corridor, signal indicators, and priority status
class NavigationHospitalScreen extends StatefulWidget {
  const NavigationHospitalScreen({super.key});

  @override
  State<NavigationHospitalScreen> createState() =>
      _NavigationHospitalScreenState();
}

class _NavigationHospitalScreenState extends State<NavigationHospitalScreen> {
  late int _etaSeconds;
  late int _initialEtaSeconds;
  late double _initialDistance;
  Timer? _timer;
  bool _isArriving = false;
  bool _initialized = false;

  // Ambulance and hospital coordinates
  double _ambulanceLat = 13.0450;
  double _ambulanceLng = 80.2400;
  double _hospitalLat = 13.0547;
  double _hospitalLng = 80.2526;

  // Store start positions for smooth animation
  late double _startAmbulanceLat;
  late double _startAmbulanceLng;

  @override
  void initState() {
    super.initState();
    _initializeFromTrip();
  }

  void _initializeFromTrip() {
    if (_initialized) return; // Only initialize once
    _initialized = true;

    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final trip = tripProvider.activeTrip;

    // Set defaults first
    _etaSeconds = 45; // 45 seconds for smooth demo
    _initialDistance = 2.5;

    if (trip != null) {
      // Use actual ETA from trip - clamp for demo (30-60 seconds)
      final actualEtaSeconds = (trip.etaToHospital ?? 180).round();
      _etaSeconds = actualEtaSeconds > 0 ? actualEtaSeconds.clamp(30, 60) : 45;

      // Use actual distance from trip or calculate
      if (trip.distanceToHospitalKm > 0) {
        _initialDistance = trip.distanceToHospitalKm.clamp(0.5, 5.0);
      }

      // Use actual hospital coordinates
      if (trip.hospital != null) {
        _hospitalLat = trip.hospital!.lat;
        _hospitalLng = trip.hospital!.lng;
        // Ambulance starts from patient location (or offset from hospital)
        if (trip.emergency != null) {
          _ambulanceLat = trip.emergency!.locationLat;
          _ambulanceLng = trip.emergency!.locationLng;
        } else {
          _ambulanceLat = _hospitalLat - 0.015;
          _ambulanceLng = _hospitalLng - 0.010;
        }
      }
    }

    // Store initial values (never change these)
    _initialEtaSeconds = _etaSeconds;
    _startAmbulanceLat = _ambulanceLat;
    _startAmbulanceLng = _ambulanceLng;

    // Start countdown after initialization
    _startEtaCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  /// Start ETA countdown with smooth position updates (~8 Hz for fluid animation)
  void _startEtaCountdown() {
    const tickMs = 120;
    var elapsedMs = 0;

    _timer = Timer.periodic(Duration(milliseconds: tickMs), (timer) {
      if (_etaSeconds <= 0 && !_isArriving) {
        _isArriving = true;
        _handleArrival();
        return;
      }

      elapsedMs += tickMs;
      final totalMs = _initialEtaSeconds * 1000;
      final progress = (elapsedMs / totalMs).clamp(0.0, 1.0);

      if (progress >= 1.0) {
        _etaSeconds = 0;
      } else {
        _etaSeconds = _initialEtaSeconds - (elapsedMs ~/ 1000);
      }

      // Update position frequently - OSMNavigationMap smooth controller interpolates
      setState(() {
        _ambulanceLat = _startAmbulanceLat +
            (_hospitalLat - _startAmbulanceLat) * progress;
        _ambulanceLng = _startAmbulanceLng +
            (_hospitalLng - _startAmbulanceLng) * progress;
      });
    });
  }

  Future<void> _handleArrival() async {
    _timer?.cancel();
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    await tripProvider.arriveAtHospital();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/trip-complete');
    }
  }

  /// Format seconds to MM:SS
  String _formatEta(int seconds) {
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    // Use listen: false to prevent rebuilds from TripProvider polling
    final tripProvider = Provider.of<TripProvider>(context, listen: false);
    final trip = tripProvider.activeTrip;
    final hospitalName = trip?.hospital?.name ?? 'Apollo Hospital';
    final signalsPreempted = trip?.signalsPreempted ?? 3;

    return Scaffold(
      // Route Signals FAB
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => Navigator.pushNamed(context, '/route-signals'),
        backgroundColor: AppColors.primary,
        tooltip: 'Route Signals',
        child: const Icon(Icons.traffic, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
      body: Stack(
        children: [
          // Full-screen OpenStreetMap with green corridor
          OSMNavigationMap(
            ambulanceLat: _ambulanceLat,
            ambulanceLng: _ambulanceLng,
            hospitalLat: _hospitalLat,
            hospitalLng: _hospitalLng,
            patientLat: _ambulanceLat, // Patient is with ambulance
            patientLng: _ambulanceLng,
            destinationName: hospitalName,
            showRoute: true,
            isGreenCorridor: true,
            tripState: 'PATIENT_ONBOARD',
            prioritySignalIds: ['SIG-001', 'SIG-003', 'SIG-005'],
          ),

          // Top status bar - Emergency Priority Active
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 12,
                bottom: 16,
                left: 20,
                right: 20,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AppColors.available,
                    AppColors.available.withOpacity(0.85),
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.available.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.flash_on,
                          color: AppColors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'GREEN CORRIDOR ACTIVE',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'En route to $hospitalName',
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.white.withOpacity(0.9),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Patient onboard badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.person,
                              size: 14,
                              color: AppColors.available,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'PATIENT',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: AppColors.available,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Signal pre-emption row
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _StatusBadge(
                          icon: Icons.traffic,
                          label: '$signalsPreempted Signals Cleared',
                        ),
                        Container(
                          width: 1,
                          height: 24,
                          color: AppColors.white.withOpacity(0.3),
                        ),
                        _StatusBadge(
                          icon: Icons.speed,
                          label: 'Priority Route',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom ETA display card
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 20,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.available, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.available.withOpacity(0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      // Distance section
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Distance',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: AppColors.text.withOpacity(0.6),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${(_initialDistance * _etaSeconds / _initialEtaSeconds).toStringAsFixed(1)} km',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: AppColors.text,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // ETA section
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 16,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.available.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'ETA',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.available,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatEta(_etaSeconds),
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: AppColors.available,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Progress bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: 1.0 - (_etaSeconds / _initialEtaSeconds),
                      backgroundColor: AppColors.secondary.withOpacity(0.15),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.available),
                      minHeight: 10,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Status row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle,
                        color: AppColors.available,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'All signals ahead cleared',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.available,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _StatusBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: AppColors.white, size: 16),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.white,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
